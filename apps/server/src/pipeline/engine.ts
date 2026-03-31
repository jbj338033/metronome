import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { loadPipeline } from './loader'
import { DagScheduler } from './scheduler'
import { StepRunner, type StepContext } from './runner'
import { evaluateCondition } from './condition'
import { agentManager } from '../agents/manager'
import { broadcast } from '../ws'
import { events } from '../events'
import type { PipelineStep, StepStatus } from '@metronome/types'

interface StepState {
  stepId: string
  status: StepStatus
  structured?: unknown
}

class PipelineEngineImpl {
  private activeRuns = new Map<string, { cancelled: boolean }>()
  private runner = new StepRunner()

  start(pipelineId: string, input: { prompt: string; cwd: string; projectId?: string }): string {
    const pipeline = loadPipeline(pipelineId)
    if (!pipeline) throw new Error(`pipeline not found: ${pipelineId}`)

    const runId = uuid()
    const db = getDb()
    db.prepare(`
      INSERT INTO pipeline_runs (id, pipeline_id, project_id, status, input)
      VALUES (?, ?, ?, 'running', ?)
    `).run(runId, pipelineId, input.projectId || null, JSON.stringify(input))

    this.activeRuns.set(runId, { cancelled: false })

    broadcast(`pipeline:${runId}`, 'status', { runId, status: 'running' })

    this.execute(runId, pipeline, input).catch((err) => {
      console.error(`pipeline ${runId} fatal error:`, err)
      this.markRunStatus(runId, 'failed', err instanceof Error ? err.message : String(err))
    })

    return runId
  }

  startFromPrompt(input: { prompt: string; cwd: string; projectId?: string }): string {
    const runId = uuid()
    const db = getDb()
    db.prepare(`
      INSERT INTO pipeline_runs (id, pipeline_id, project_id, status, input)
      VALUES (?, ?, ?, 'running', ?)
    `).run(runId, '__orchestrated', input.projectId || null, JSON.stringify(input))

    this.activeRuns.set(runId, { cancelled: false })
    broadcast(`pipeline:${runId}`, 'status', { runId, status: 'running' })

    this.orchestrateAndExecute(runId, input).catch((err) => {
      console.error(`orchestrated pipeline ${runId} fatal error:`, err)
      this.markRunStatus(runId, 'failed', err instanceof Error ? err.message : String(err))
    })

    return runId
  }

  private async orchestrateAndExecute(
    runId: string,
    input: { prompt: string; cwd: string },
  ) {
    const orchestratorStep: PipelineStep = { id: '__orchestrate', blueprint: 'orchestrator' }
    const orchestratorResult = await this.runner.execute(
      orchestratorStep, runId, input.prompt, input.cwd, [],
    )

    const plan = orchestratorResult.structured as {
      spec?: { goal?: string }
      steps?: PipelineStep[]
      final_verify?: string
      max_replan?: number
    } | null

    if (!plan?.steps?.length) {
      this.markRunStatus(runId, 'failed')
      return
    }

    const pipeline = {
      name: '__orchestrated',
      max_replan: plan.max_replan ?? 2,
      timeout: 3600,
      steps: plan.steps,
      final_verify: plan.final_verify,
    }

    await this.execute(runId, pipeline, input)
  }

  cancel(runId: string) {
    const run = this.activeRuns.get(runId)
    if (!run) return

    run.cancelled = true

    const db = getDb()
    const runningSteps = db.prepare("SELECT agent_id FROM step_runs WHERE run_id = ? AND status = 'running'").all(runId) as { agent_id: string }[]
    for (const { agent_id } of runningSteps) {
      if (agent_id) agentManager.kill(agent_id, 'pipeline_cancelled')
    }

    db.prepare("UPDATE step_runs SET status = 'cancelled' WHERE run_id = ? AND status IN ('pending', 'running')").run(runId)
    this.markRunStatus(runId, 'cancelled')
    this.activeRuns.delete(runId)
  }

  approve(runId: string, stepId: string) {
    events.emit('approval:response', runId, stepId, true)
    broadcast(`pipeline:${runId}`, 'approval', { stepId, approved: true })
  }

  reject(runId: string, stepId: string) {
    events.emit('approval:response', runId, stepId, false)
    broadcast(`pipeline:${runId}`, 'approval', { stepId, approved: false })
  }

  recover() {
    const db = getDb()
    const orphans = db.prepare("SELECT id FROM pipeline_runs WHERE status = 'running'").all() as { id: string }[]
    for (const { id } of orphans) {
      db.prepare("UPDATE pipeline_runs SET status = 'interrupted', ended_at = datetime('now') WHERE id = ?").run(id)
      db.prepare("UPDATE step_runs SET status = 'cancelled' WHERE run_id = ? AND status IN ('pending', 'running')").run(id)
    }
    if (orphans.length > 0) {
      console.log(`recovered ${orphans.length} orphaned pipeline runs`)
    }
  }

  private async execute(
    runId: string,
    pipeline: { name: string; max_replan?: number; timeout?: number; steps: PipelineStep[] },
    input: { prompt: string; cwd: string },
  ) {
    const scheduler = new DagScheduler(pipeline.steps)
    const states = new Map<string, StepState>()
    const results = new Map<string, StepContext>()

    for (const id of scheduler.getAllStepIds()) {
      states.set(id, { stepId: id, status: 'pending' })
    }

    const pipelineTimeout = pipeline.timeout
      ? setTimeout(() => this.cancel(runId), pipeline.timeout * 1000)
      : null

    try {
      while (true) {
        if (this.activeRuns.get(runId)?.cancelled) break

        const readySteps = scheduler.getReadySteps(states)
        if (readySteps.length === 0) {
          const allDone = [...states.values()].every(
            (s) => s.status === 'completed' || s.status === 'skipped' || s.status === 'failed' || s.status === 'cancelled',
          )
          if (allDone) {
            const hasFailure = [...states.values()].some((s) => s.status === 'failed')
            if (hasFailure && pipeline.max_replan) {
              const replanned = await this.replan(runId, input, scheduler, states, results, pipeline.max_replan)
              if (replanned) continue
            }
            break
          }

          await new Promise<void>((resolve) => {
            const onStep = (rid: string) => {
              if (rid !== runId) return
              events.removeListener('step:completed', onStep)
              events.removeListener('step:failed', onStep)
              clearTimeout(fallback)
              resolve()
            }
            events.on('step:completed', onStep)
            events.on('step:failed', onStep)
            const fallback = setTimeout(() => {
              events.removeListener('step:completed', onStep)
              events.removeListener('step:failed', onStep)
              resolve()
            }, 5000)
          })
          continue
        }

        const executing = readySteps.map(async (step) => {
          if (step.condition) {
            const conditionMet = evaluateCondition(step.condition, results)
            if (!conditionMet) {
              states.set(step.id, { stepId: step.id, status: 'skipped' })
              broadcast(`pipeline:${runId}`, 'step', { stepId: step.id, status: 'skipped' })

              if (step.on_skip === 'propagate') {
                this.propagateSkip(step.id, scheduler, states, runId)
              }
              return
            }
          }

          if (step.approval) {
            states.set(step.id, { stepId: step.id, status: 'pending' })
            broadcast(`pipeline:${runId}`, 'step', { stepId: step.id, status: 'awaiting_approval' })
            this.markRunStatus(runId, 'awaiting_approval')

            const approved = await this.waitForApproval(runId, step.id)
            if (!approved) {
              states.set(step.id, { stepId: step.id, status: 'cancelled' })
              this.markRunStatus(runId, 'cancelled')
              return
            }
            this.markRunStatus(runId, 'running')
          }

          states.set(step.id, { stepId: step.id, status: 'running' })

          if (step.fan_out) {
            await this.executeFanOut(step, runId, input, results, states)
          } else if (step.verify) {
            await this.executeWithVerification(step, runId, input, results, states)
          } else {
            await this.executeSingleStep(step, runId, input, results, states)
          }
        })

        await Promise.all(executing)
      }
    } finally {
      if (pipelineTimeout) clearTimeout(pipelineTimeout)
      this.activeRuns.delete(runId)
    }

    const hasFailure = [...states.values()].some((s) => s.status === 'failed')
    const wasCancelled = [...states.values()].some((s) => s.status === 'cancelled')

    if (wasCancelled) {
      this.markRunStatus(runId, 'cancelled')
    } else if (hasFailure) {
      this.markRunStatus(runId, 'failed')
    } else {
      this.markRunStatus(runId, 'completed')
    }
  }

  private async executeSingleStep(
    step: PipelineStep,
    runId: string,
    input: { prompt: string; cwd: string },
    results: Map<string, StepContext>,
    states: Map<string, StepState>,
  ) {
    const maxRetries = step.retry?.max ?? 0
    const backoffType = step.retry?.backoff ?? 'linear'

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = backoffType === 'exponential'
          ? Math.min(1000 * Math.pow(2, attempt - 1), 30_000)
          : 1000 * attempt

        states.set(step.id, { stepId: step.id, status: 'retrying' })
        broadcast(`pipeline:${runId}`, 'step', {
          stepId: step.id, status: 'retrying', attempt, maxRetries,
        })

        await new Promise((r) => setTimeout(r, delay))
      }

      const previousContext = [...results.values()]
      try {
        const result = await this.runner.execute(step, runId, input.prompt, input.cwd, previousContext)
        results.set(step.id, result)

        if (step.verify_command) {
          const verify = await this.runner.verifyWithCommand(step.verify_command, input.cwd)
          broadcast(`pipeline:${runId}`, 'verify', {
            stepId: step.id, type: 'command', passed: verify.passed, output: verify.output.slice(0, 500),
          })
          if (!verify.passed) {
            if (attempt < maxRetries) continue
            states.set(step.id, { stepId: step.id, status: 'failed' })
            events.emit('step:failed', runId, step.id)
            return
          }
        }

        states.set(step.id, { stepId: step.id, status: 'completed', structured: result.structured })
        events.emit('step:completed', runId, step.id)
        return
      } catch {
        if (attempt === maxRetries) {
          states.set(step.id, { stepId: step.id, status: 'failed' })
          events.emit('step:failed', runId, step.id)
          return
        }
      }
    }
  }

  private async executeWithVerification(
    step: PipelineStep,
    runId: string,
    input: { prompt: string; cwd: string },
    results: Map<string, StepContext>,
    states: Map<string, StepState>,
  ) {
    const verify = step.verify!
    const maxFixes = verify.max_fix_attempts

    for (let fixAttempt = 0; fixAttempt <= maxFixes; fixAttempt++) {
      if (fixAttempt > 0) {
        const verifyResult = results.get(`${step.id}__verify`)
        const fixContext: string[] = []

        if (verify.include_in_fix.includes('issues') && verifyResult?.structured) {
          fixContext.push(`[verification failed — attempt ${fixAttempt}]\n${JSON.stringify(verifyResult.structured, null, 2)}`)
        }
        if (verify.include_in_fix.includes('output') && results.get(step.id)?.output) {
          fixContext.push(`[previous output]\n${results.get(step.id)!.output.slice(-2000)}`)
        }
        if (verify.include_in_fix.includes('artifacts') && results.get(step.id)?.artifacts.length) {
          fixContext.push(`[changed files]\n${results.get(step.id)!.artifacts.join('\n')}`)
        }

        broadcast(`pipeline:${runId}`, 'step', {
          stepId: step.id, status: 'retrying', fixAttempt, maxFixes,
        })

        const fixInput = { ...input, prompt: `${input.prompt}\n\n${fixContext.join('\n\n')}` }
        await this.executeSingleStep(step, runId, fixInput, results, states)
      } else {
        await this.executeSingleStep(step, runId, input, results, states)
      }

      if (states.get(step.id)?.status !== 'completed') {
        return
      }

      const verifyStep: PipelineStep = {
        id: `${step.id}__verify`,
        blueprint: verify.blueprint,
        context: [{ step: step.id, include: ['output', 'artifacts', 'structured'] }],
      }

      broadcast(`pipeline:${runId}`, 'verify', {
        stepId: step.id, attempt: fixAttempt, status: 'running',
      })

      try {
        const verifyResult = await this.runner.execute(
          verifyStep, runId, input.prompt, input.cwd, [...results.values()],
        )
        results.set(`${step.id}__verify`, verifyResult)

        const passed = evaluateCondition(
          verify.pass_condition,
          new Map([[verifyStep.id, { structured: verifyResult.structured }]]),
        )

        broadcast(`pipeline:${runId}`, 'verify', {
          stepId: step.id, attempt: fixAttempt, passed,
          issues: verifyResult.structured,
        })

        if (passed) {
          return
        }
      } catch {
        broadcast(`pipeline:${runId}`, 'verify', {
          stepId: step.id, attempt: fixAttempt, passed: false, error: 'verification agent failed',
        })
      }
    }

    states.set(step.id, { stepId: step.id, status: 'failed' })
    events.emit('step:failed', runId, step.id)
    broadcast(`pipeline:${runId}`, 'step', {
      stepId: step.id, status: 'failed', reason: 'verification_exhausted',
    })
  }

  private async executeFanOut(
    step: PipelineStep,
    runId: string,
    input: { prompt: string; cwd: string },
    results: Map<string, StepContext>,
    states: Map<string, StepState>,
  ) {
    const parts = step.fan_out!.split('.')
    const [sourceStepId, ...path] = parts
    const sourceResult = results.get(sourceStepId)
    let items: unknown[] = []

    if (sourceResult?.structured) {
      let value: unknown = sourceResult.structured
      for (const key of path) {
        if (value && typeof value === 'object') {
          value = (value as Record<string, unknown>)[key]
        }
      }
      if (Array.isArray(value)) items = value
    }

    if (items.length === 0) {
      states.set(step.id, { stepId: step.id, status: 'completed' })
      return
    }

    const maxConcurrency = step.max_concurrency || items.length
    const allResults: StepContext[] = []

    for (let i = 0; i < items.length; i += maxConcurrency) {
      const batch = items.slice(i, i + maxConcurrency)
      const batchResults = await Promise.all(
        batch.map(async (item, batchIdx) => {
          const fanIndex = i + batchIdx
          const rec = item as Record<string, string> | null
          const itemPrompt = typeof item === 'object' && item !== null
            ? `${rec?.title ?? ''}\n${rec?.description ?? ''}`
            : String(item)

          try {
            return await this.runner.execute(
              step, runId, itemPrompt, input.cwd, [...results.values()], fanIndex,
            )
          } catch {
            return null
          }
        }),
      )
      allResults.push(...batchResults.filter(Boolean) as StepContext[])
    }

    const allSucceeded = allResults.length === items.length
    const mergedResult: StepContext = {
      stepId: step.id,
      output: allResults.map((r) => r.output).join('\n---\n'),
      artifacts: allResults.flatMap((r) => r.artifacts),
      structured: { results: allResults.map((r) => r.structured) },
    }

    results.set(step.id, mergedResult)
    const fanStatus = allSucceeded ? 'completed' : 'failed'
    states.set(step.id, {
      stepId: step.id,
      status: fanStatus,
      structured: mergedResult.structured,
    })

    if (fanStatus === 'completed') {
      events.emit('step:completed', runId, step.id)
    } else {
      events.emit('step:failed', runId, step.id)
    }
  }

  private propagateSkip(
    stepId: string,
    scheduler: DagScheduler,
    states: Map<string, StepState>,
    runId: string,
  ) {
    const dependents = scheduler.getDependents(stepId)
    for (const dep of dependents) {
      states.set(dep.id, { stepId: dep.id, status: 'skipped' })
      broadcast(`pipeline:${runId}`, 'step', { stepId: dep.id, status: 'skipped' })
      if (dep.on_skip === 'propagate') {
        this.propagateSkip(dep.id, scheduler, states, runId)
      }
    }
  }

  private waitForApproval(runId: string, stepId: string): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        events.removeListener('approval:response', handler)
        resolve(false)
      }, 30 * 60 * 1000)

      const handler = (rid: string, sid: string, approved: boolean) => {
        if (rid !== runId || sid !== stepId) return
        clearTimeout(timeout)
        events.removeListener('approval:response', handler)
        resolve(approved)
      }

      events.on('approval:response', handler)
    })
  }

  private async replan(
    runId: string,
    input: { prompt: string; cwd: string },
    scheduler: DagScheduler,
    states: Map<string, StepState>,
    results: Map<string, StepContext>,
    maxReplan: number,
  ): Promise<boolean> {
    const db = getDb()
    const run = db.prepare('SELECT replan_count FROM pipeline_runs WHERE id = ?').get(runId) as { replan_count: number } | undefined
    if (!run || run.replan_count >= maxReplan) return false

    this.markRunStatus(runId, 'replanning')

    const completedSummary = [...results.entries()]
      .map(([id, ctx]) => `${id}: ${ctx.structured ? JSON.stringify(ctx.structured) : 'completed'}`)
      .join('\n')

    const failedSummary = [...states.entries()]
      .filter(([, s]) => s.status === 'failed')
      .map(([id]) => id)
      .join(', ')

    const replanPrompt = `Some steps of the previous plan failed. Replan.\n\n[completed steps]\n${completedSummary}\n\n[failed steps]\n${failedSummary}\n\n[original request]\n${input.prompt}`

    const orchestratorStep: PipelineStep = { id: '__replan', blueprint: 'orchestrator' }
    try {
      const replanResult = await this.runner.execute(
        orchestratorStep, runId, replanPrompt, input.cwd, [...results.values()],
      )

      const plan = replanResult.structured as { steps?: PipelineStep[] } | null
      if (!plan?.steps?.length) return false

      const completedIds = new Set(
        [...states.entries()].filter(([, s]) => s.status === 'completed').map(([id]) => id),
      )
      const newSteps = [
        ...plan.steps.filter((s) => !completedIds.has(s.id)),
      ]

      for (const step of newSteps) {
        if (!states.has(step.id)) {
          states.set(step.id, { stepId: step.id, status: 'pending' })
        }
      }

      const allSteps = [
        ...plan.steps,
      ]
      scheduler.rebuild(allSteps)

      db.prepare('UPDATE pipeline_runs SET replan_count = replan_count + 1 WHERE id = ?').run(runId)
      this.markRunStatus(runId, 'running')

      broadcast(`pipeline:${runId}`, 'replan', {
        runId, replanCount: (run.replan_count || 0) + 1, newSteps: newSteps.map((s) => s.id),
      })

      return true
    } catch {
      this.markRunStatus(runId, 'running')
      return false
    }
  }

  requestReplan(runId: string) {
    events.emit('step:failed', runId, '__manual_replan')
  }

  private markRunStatus(runId: string, status: string, error?: string) {
    const db = getDb()
    if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'interrupted') {
      db.prepare("UPDATE pipeline_runs SET status = ?, error = ?, ended_at = datetime('now') WHERE id = ?").run(status, error || null, runId)
    } else {
      db.prepare('UPDATE pipeline_runs SET status = ? WHERE id = ?').run(status, runId)
    }
    broadcast(`pipeline:${runId}`, 'status', { runId, status, error })
  }
}

const key = Symbol.for('metronome.pipeline_engine')
const g = globalThis as unknown as Record<symbol, PipelineEngineImpl>
g[key] = new PipelineEngineImpl()

export const pipelineEngine: PipelineEngineImpl = g[key]
