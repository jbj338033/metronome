import { execFile } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { agentManager } from '../agents/manager'
import { loadBlueprint } from './loader'
import { extractStructured, extractAndValidate, renderTemplate } from './parser'
import { selectModel } from '../agents/model-router'
import { broadcast } from '../ws'
import { events } from '../events'
import type { PipelineStep } from '@metronome/types'

export interface StepContext {
  stepId: string
  output: string
  artifacts: string[]
  structured: unknown
}

interface StructuredWithComplexity {
  complexity: string
  [key: string]: unknown
}

function hasComplexity(v: unknown): v is StructuredWithComplexity {
  return typeof v === 'object' && v !== null && 'complexity' in v
}

interface StructuredWithFiles {
  files_changed: string[]
  [key: string]: unknown
}

function hasFilesChanged(v: unknown): v is StructuredWithFiles {
  return typeof v === 'object' && v !== null && 'files_changed' in v && Array.isArray((v as Record<string, unknown>).files_changed)
}

export class StepRunner {
  async execute(
    step: PipelineStep,
    runId: string,
    prompt: string,
    cwd: string,
    previousContext: StepContext[],
    fanIndex?: number,
  ): Promise<StepContext> {
    const blueprint = loadBlueprint(step.blueprint)
    if (!blueprint) throw new Error(`blueprint not found: ${step.blueprint}`)

    const contextStr = this.buildContext(step, previousContext, 16_000)

    const finalPrompt = blueprint.prompt_template
      ? renderTemplate(blueprint.prompt_template, { prompt, context: contextStr || undefined })
      : prompt

    const stepRunId = uuid()
    const db = getDb()
    db.prepare(`
      INSERT INTO step_runs (id, run_id, step_id, fan_index, status, input, started_at)
      VALUES (?, ?, ?, ?, 'running', ?, datetime('now'))
    `).run(stepRunId, runId, step.id, fanIndex ?? null, finalPrompt)

    broadcast(`pipeline:${runId}`, 'step', {
      stepId: step.id,
      status: 'running',
      fanIndex,
    })

    const agentType = step.agent || blueprint.agent
    let model = step.model || blueprint.model
    if (!step.model && blueprint.model_routing !== 'fixed') {
      for (const prev of previousContext) {
        if (hasComplexity(prev.structured)) {
          model = selectModel(prev.structured.complexity, blueprint.model)
          break
        }
      }
    }

    const stepPrompt = step.prompt ? renderTemplate(
      blueprint.prompt_template || '{{prompt}}',
      { prompt: step.prompt, context: contextStr || undefined },
    ) : finalPrompt

    const agentTimeout = (step.timeout || blueprint.timeout || 300) * 1000
    const agentId = agentManager.spawn({
      typeId: agentType,
      prompt: stepPrompt,
      cwd,
      model,
      blueprint: blueprint.name,
      timeout: agentTimeout,
      systemPrompt: blueprint.system,
    })

    db.prepare('UPDATE step_runs SET agent_id = ? WHERE id = ?').run(agentId, stepRunId)

    const result = await this.waitForAgent(agentId, agentTimeout + 30_000)

    const { data: structured, valid, errors: schemaErrors } = extractAndValidate(
      result.output, blueprint.output_schema,
    )
    if (blueprint.output_schema && !valid) {
      console.warn(`schema validation failed for step "${step.id}":`, schemaErrors)
    }
    const artifacts = hasFilesChanged(structured) ? structured.files_changed : []

    if (artifacts.length > 0) {
      const insertChange = db.prepare(
        'INSERT INTO file_changes (run_id, step_id, file_path, change_type) VALUES (?, ?, ?, ?)',
      )
      for (const filePath of artifacts) {
        insertChange.run(runId, step.id, filePath, 'modified')
      }
    }

    const status = result.success ? 'completed' : 'failed'
    db.prepare(`
      UPDATE step_runs SET status = ?, output = ?, artifacts = ?, structured = ?, ended_at = datetime('now')
      WHERE id = ?
    `).run(status, result.output, JSON.stringify(artifacts), structured ? JSON.stringify(structured) : null, stepRunId)

    broadcast(`pipeline:${runId}`, 'step', {
      stepId: step.id,
      status,
      fanIndex,
      structured,
    })

    if (!result.success) {
      throw new Error(`step "${step.id}" failed: ${result.output.slice(-200)}`)
    }

    const stepResult: StepContext = { stepId: step.id, output: result.output, artifacts, structured }
    this.saveStepResult(runId, step.id, stepResult)
    return stepResult
  }

  saveStepResult(runId: string, stepId: string, result: StepContext) {
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
    const dir = path.join(root, 'data', 'runs', runId, 'results')
    fs.mkdirSync(dir, { recursive: true })
    const summary = {
      stepId: result.stepId,
      artifacts: result.artifacts,
      structured: result.structured,
      outputLength: result.output.length,
    }
    fs.writeFileSync(path.join(dir, `${stepId}.json`), JSON.stringify(summary, null, 2))
  }

  verifyWithCommand(command: string, cwd: string): Promise<{ passed: boolean; output: string }> {
    return new Promise((resolve) => {
      const [cmd, ...args] = command.split(' ')
      execFile(cmd, args, { cwd, timeout: 60_000 }, (err, stdout, stderr) => {
        if (err) {
          resolve({ passed: false, output: `${stderr}\n${stdout}`.trim() })
        } else {
          resolve({ passed: true, output: stdout.trim() })
        }
      })
    })
  }

  private buildContext(
    step: PipelineStep,
    previousContext: StepContext[],
    maxBytes: number,
  ): string {
    const parts: string[] = []
    let used = 0

    const addPart = (content: string): boolean => {
      if (used + content.length > maxBytes) {
        const remaining = maxBytes - used
        if (remaining > 100) {
          parts.push(content.slice(0, remaining) + '\n[...truncated]')
          used = maxBytes
        }
        return false
      }
      parts.push(content)
      used += content.length
      return true
    }

    if (step.context) {
      for (const ctx of step.context) {
        const prev = previousContext.find((c) => c.stepId === ctx.step)
        if (!prev) continue
        for (const field of ctx.include) {
          let content = ''
          if (field === 'artifacts') {
            content = `changed files: ${prev.artifacts.join(', ')}\n`
          } else if (field === 'output') {
            content = prev.output + '\n'
          } else if (field === 'structured') {
            content = JSON.stringify(prev.structured, null, 2) + '\n'
          }
          if (content && !addPart(content)) break
        }
      }
    } else if (previousContext.length > 0) {
      const last = previousContext[previousContext.length - 1]
      if (last.structured) {
        addPart(JSON.stringify(last.structured, null, 2))
      }
    }

    return parts.join('\n')
  }

  private getAgentResult(agentId: string): { success: boolean; output: string } {
    const db = getDb()
    const agent = db.prepare('SELECT status FROM agents WHERE id = ?').get(agentId) as { status: string } | undefined
    const output = agentManager.getOutput(agentId)
    return { success: agent?.status === 'completed', output: output || '' }
  }

  private waitForAgent(agentId: string, timeoutMs: number): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      if (!agentManager.isRunning(agentId)) {
        return resolve(this.getAgentResult(agentId))
      }

      const timer = setTimeout(() => {
        cleanup()
        agentManager.kill(agentId, 'step_timeout')
        resolve({ success: false, output: 'agent timed out' })
      }, timeoutMs)

      const cleanup = () => {
        clearTimeout(timer)
        events.removeListener('agent:completed', onDone)
        events.removeListener('agent:failed', onDone)
      }

      const onDone = (id: string) => {
        if (id !== agentId) return
        cleanup()
        resolve(this.getAgentResult(agentId))
      }

      events.on('agent:completed', onDone)
      events.on('agent:failed', onDone)
    })
  }
}
