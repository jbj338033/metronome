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

export class StepRunner {
  /**
   * 스텝 하나를 실행하고 완료될 때까지 대기
   */
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

    // 컨텍스트 구성 (토큰 예산: ~4000 토큰 ≈ 16KB)
    const contextStr = this.buildContext(step, previousContext, 16_000)

    // 프롬프트 템플릿 렌더링
    const finalPrompt = blueprint.prompt_template
      ? renderTemplate(blueprint.prompt_template, { prompt, context: contextStr || undefined })
      : prompt

    // step_run 레코드 생성
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

    // 에이전트/모델 결정: 스텝 오버라이드 > 모델 라우팅 > 블루프린트 기본값
    const agentType = step.agent || blueprint.agent
    let model = step.model || blueprint.model
    if (!step.model && blueprint.model_routing !== 'fixed') {
      for (const prev of previousContext) {
        if (prev.structured && typeof prev.structured === 'object' && 'complexity' in (prev.structured as any)) {
          model = selectModel((prev.structured as any).complexity, blueprint.model)
          break
        }
      }
    }

    // 프롬프트: 스텝 레벨 prompt가 있으면 우선 사용
    const stepPrompt = step.prompt ? renderTemplate(
      blueprint.prompt_template || '{{prompt}}',
      { prompt: step.prompt, context: contextStr || undefined },
    ) : finalPrompt

    // 에이전트 spawn
    const agentId = agentManager.spawn({
      typeId: agentType,
      prompt: stepPrompt,
      cwd,
      model,
      blueprint: blueprint.name,
      timeout: (step.timeout || blueprint.timeout || 300) * 1000,
      systemPrompt: blueprint.system,
    })

    db.prepare('UPDATE step_runs SET agent_id = ? WHERE id = ?').run(agentId, stepRunId)

    // 에이전트 완료 대기
    const result = await this.waitForAgent(agentId)

    // 결과 파싱 + 스키마 검증
    const { data: structured, valid, errors: schemaErrors } = extractAndValidate(
      result.output, blueprint.output_schema,
    )
    if (blueprint.output_schema && !valid) {
      console.warn(`schema validation failed for step "${step.id}":`, schemaErrors)
    }
    const artifacts = structured && typeof structured === 'object' && 'files_changed' in (structured as any)
      ? (structured as any).files_changed as string[]
      : []

    // file_changes 기록
    if (artifacts.length > 0) {
      const insertChange = db.prepare(
        'INSERT INTO file_changes (run_id, step_id, file_path, change_type) VALUES (?, ?, ?, ?)',
      )
      for (const filePath of artifacts) {
        insertChange.run(runId, step.id, filePath, 'modified')
      }
    }

    // step_run 업데이트
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
            content = `변경된 파일: ${prev.artifacts.join(', ')}\n`
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

  private waitForAgent(agentId: string): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      if (!agentManager.isRunning(agentId)) {
        return resolve(this.getAgentResult(agentId))
      }

      const cleanup = () => {
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
