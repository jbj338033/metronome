import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { loadPipeline } from './loader'
import { DagScheduler } from './scheduler'
import { StepRunner, type StepContext } from './runner'
import { evaluateCondition } from './condition'
import { agentManager } from '../agents/manager'
import { broadcast } from '../ws'
import type { PipelineStep, StepStatus } from '@metronome/types'

interface StepState {
  stepId: string
  status: StepStatus
  structured?: unknown
}

class PipelineEngineImpl {
  private activeRuns = new Map<string, { cancelled: boolean }>()
  private runner = new StepRunner()

  /**
   * 파이프라인 실행 시작 — runId 즉시 반환, 백그라운드 실행
   */
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

    // 백그라운드 실행
    this.execute(runId, pipeline, input).catch((err) => {
      console.error(`pipeline ${runId} fatal error:`, err)
      this.markRunStatus(runId, 'failed')
    })

    return runId
  }

  cancel(runId: string) {
    const run = this.activeRuns.get(runId)
    if (!run) return

    run.cancelled = true

    // 실행 중인 에이전트 킬
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
    broadcast(`pipeline:${runId}`, 'approval', { stepId, approved: true })
  }

  reject(runId: string, stepId: string) {
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

    // 모든 스텝을 pending으로 초기화
    for (const id of scheduler.getAllStepIds()) {
      states.set(id, { stepId: id, status: 'pending' })
    }

    // 전체 타임아웃
    const pipelineTimeout = pipeline.timeout
      ? setTimeout(() => this.cancel(runId), pipeline.timeout * 1000)
      : null

    try {
      while (true) {
        if (this.activeRuns.get(runId)?.cancelled) break

        const readySteps = scheduler.getReadySteps(states)
        if (readySteps.length === 0) {
          // 모든 스텝이 완료/스킵/실패 상태인지 확인
          const allDone = [...states.values()].every(
            (s) => s.status === 'completed' || s.status === 'skipped' || s.status === 'failed' || s.status === 'cancelled',
          )
          if (allDone) break

          // 아직 running인 스텝이 있으면 대기
          await new Promise((r) => setTimeout(r, 1000))
          continue
        }

        // 준비된 스텝들 실행
        const executing = readySteps.map(async (step) => {
          // 조건 평가
          if (step.condition) {
            const conditionMet = evaluateCondition(step.condition, results)
            if (!conditionMet) {
              states.set(step.id, { stepId: step.id, status: 'skipped' })
              broadcast(`pipeline:${runId}`, 'step', { stepId: step.id, status: 'skipped' })

              // on_skip 처리
              if (step.on_skip === 'propagate') {
                this.propagateSkip(step.id, scheduler, states, runId)
              }
              return
            }
          }

          // 승인 게이트
          if (step.approval) {
            states.set(step.id, { stepId: step.id, status: 'pending' })
            broadcast(`pipeline:${runId}`, 'step', { stepId: step.id, status: 'awaiting_approval' as any })
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

          // fan_out 처리
          if (step.fan_out) {
            await this.executeFanOut(step, runId, input, results, states)
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

    // 최종 상태 결정
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
    const previousContext = [...results.values()]
    try {
      const result = await this.runner.execute(step, runId, input.prompt, input.cwd, previousContext)
      results.set(step.id, result)
      states.set(step.id, { stepId: step.id, status: 'completed', structured: result.structured })
    } catch (err) {
      states.set(step.id, { stepId: step.id, status: 'failed' })
      // 의존 스텝 일시정지는 getReadySteps가 자동 처리 (failed deps는 ready가 안 됨)
    }
  }

  private async executeFanOut(
    step: PipelineStep,
    runId: string,
    input: { prompt: string; cwd: string },
    results: Map<string, StepContext>,
    states: Map<string, StepState>,
  ) {
    // fan_out 경로에서 배열 추출
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

    // 동시성 제한 실행
    for (let i = 0; i < items.length; i += maxConcurrency) {
      const batch = items.slice(i, i + maxConcurrency)
      const batchResults = await Promise.all(
        batch.map(async (item, batchIdx) => {
          const fanIndex = i + batchIdx
          const itemPrompt = typeof item === 'object' && item !== null
            ? `${(item as any).title || ''}\n${(item as any).description || ''}`
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
    states.set(step.id, {
      stepId: step.id,
      status: allSucceeded ? 'completed' : 'failed',
      structured: mergedResult.structured,
    })
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
      const unsub = broadcast.__onApproval?.((rid: string, sid: string, approved: boolean) => {
        if (rid === runId && sid === stepId) {
          unsub?.()
          resolve(approved)
        }
      })

      // DB 폴링 대체 (broadcast 훅이 없는 경우)
      if (!unsub) {
        // 간단한 폴링 — 프로덕션에서는 이벤트 기반으로
        const poll = setInterval(() => {
          // approval은 API에서 직접 처리하므로 여기서는 대기만
        }, 5000)

        // 임시: 30분 후 자동 타임아웃
        setTimeout(() => {
          clearInterval(poll)
          resolve(false)
        }, 30 * 60 * 1000)
      }
    })
  }

  private markRunStatus(runId: string, status: string) {
    const db = getDb()
    if (status === 'completed' || status === 'failed' || status === 'cancelled' || status === 'interrupted') {
      db.prepare("UPDATE pipeline_runs SET status = ?, ended_at = datetime('now') WHERE id = ?").run(status, runId)
    } else {
      db.prepare('UPDATE pipeline_runs SET status = ? WHERE id = ?').run(status, runId)
    }
    broadcast(`pipeline:${runId}`, 'status', { runId, status })
  }
}

const key = '__metronome_pipeline_engine__'
if (!(globalThis as any)[key]) {
  (globalThis as any)[key] = new PipelineEngineImpl()
}

export const pipelineEngine: PipelineEngineImpl = (globalThis as any)[key]
