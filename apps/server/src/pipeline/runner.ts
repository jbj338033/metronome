import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { agentManager } from '../agents/manager'
import { loadBlueprint } from './loader'
import { extractStructured, renderTemplate } from './parser'
import { broadcast } from '../ws'
import type { PipelineStep, StepRun } from '@metronome/types'

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

    // 컨텍스트 구성
    let contextStr = ''
    if (step.context) {
      for (const ctx of step.context) {
        const prev = previousContext.find((c) => c.stepId === ctx.step)
        if (!prev) continue
        for (const field of ctx.include) {
          if (field === 'artifacts') {
            contextStr += `변경된 파일: ${prev.artifacts.join(', ')}\n`
          } else if (field === 'output') {
            contextStr += prev.output + '\n'
          } else if (field === 'structured') {
            contextStr += JSON.stringify(prev.structured, null, 2) + '\n'
          }
        }
      }
    } else if (previousContext.length > 0) {
      // context 미지정 시 직전 스텝의 output 요약만
      const last = previousContext[previousContext.length - 1]
      if (last.structured) {
        contextStr = JSON.stringify(last.structured, null, 2)
      }
    }

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

    // 에이전트 spawn
    const agentId = agentManager.spawn({
      typeId: blueprint.agent,
      prompt: finalPrompt,
      cwd,
      model: blueprint.model,
      blueprint: blueprint.name,
      timeout: (step.timeout || blueprint.timeout || 300) * 1000,
      systemPrompt: blueprint.system,
    })

    db.prepare('UPDATE step_runs SET agent_id = ? WHERE id = ?').run(agentId, stepRunId)

    // 에이전트 완료 대기
    const result = await this.waitForAgent(agentId)

    // 결과 파싱
    const structured = extractStructured(result.output)
    const artifacts = structured && typeof structured === 'object' && 'files_changed' in (structured as any)
      ? (structured as any).files_changed as string[]
      : []

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

    return {
      stepId: step.id,
      output: result.output,
      artifacts,
      structured,
    }
  }

  private waitForAgent(agentId: string): Promise<{ success: boolean; output: string }> {
    return new Promise((resolve) => {
      const check = () => {
        if (!agentManager.isRunning(agentId)) {
          const db = getDb()
          const agent = db.prepare('SELECT status FROM agents WHERE id = ?').get(agentId) as { status: string } | undefined
          const output = agentManager.getOutput(agentId)
          resolve({
            success: agent?.status === 'completed',
            output: output || '',
          })
          return
        }
        setTimeout(check, 500)
      }
      check()
    })
  }
}
