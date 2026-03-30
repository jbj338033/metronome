import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { PipelineTimeline } from '@/widgets/pipeline-timeline/ui'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import { cn } from '@/shared/lib/cn'
import type { PipelineRun, StepRun } from '@metronome/types'

const runStatusBadge: Record<string, { label: string; cls: string }> = {
  running: { label: 'running', cls: 'bg-emerald-900/50 text-emerald-400' },
  completed: { label: 'done', cls: 'bg-zinc-800 text-zinc-300' },
  failed: { label: 'failed', cls: 'bg-red-900/30 text-red-400' },
  cancelled: { label: 'cancelled', cls: 'bg-zinc-800 text-zinc-500' },
  interrupted: { label: 'interrupted', cls: 'bg-yellow-900/30 text-yellow-400' },
  awaiting_approval: { label: 'awaiting approval', cls: 'bg-yellow-900/30 text-yellow-400' },
}

export function PipelineRunPage() {
  const { id } = useParams()
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [steps, setSteps] = useState<StepRun[]>([])
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const [runData, stepsData] = await Promise.all([
          fetch(`/api/pipelines/runs/${id}`).then((r) => r.json()),
          fetch(`/api/pipelines/runs/${id}/steps`).then((r) => r.json()),
        ])
        setRun(runData)
        setSteps(stepsData)
      } catch (err) {
        setError('failed to load pipeline run')
      }
    }
    fetchData()

    // WS 구독
    wsClient.subscribe([`pipeline:${id}`])
    const unsub = wsClient.onMessage((msg) => {
      if (msg.topic !== `pipeline:${id}`) return
      // 상태 변경 시 리페치
      fetchData()
    })

    const interval = setInterval(fetchData, 3000)
    return () => {
      wsClient.unsubscribe([`pipeline:${id}`])
      unsub()
      clearInterval(interval)
    }
  }, [id])

  if (error) return <div className="p-6 text-sm text-red-400">{error}</div>
  if (!run) return <div className="p-6 text-sm text-zinc-500">loading...</div>

  const badge = runStatusBadge[run.status] || runStatusBadge.running
  const activeStepRun = steps.find((s) => s.step_id === activeStep && s.status === 'running')

  const input = JSON.parse(run.input) as { prompt: string; cwd: string }

  async function handleCancel() {
    await fetch(`/api/pipelines/runs/${id}/cancel`, { method: 'POST' })
  }

  async function handleApprove(stepId: string) {
    await fetch(`/api/pipelines/runs/${id}/approve/${stepId}`, { method: 'POST' })
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <Link to="/pipelines/editor" className="text-xs text-zinc-500 hover:text-zinc-300">← Pipelines</Link>
        <h1 className="text-sm font-semibold">{run.pipeline_id}</h1>
        <span className="font-[var(--font-mono)] text-xs text-zinc-600">#{id?.slice(0, 8)}</span>
        <span className={cn('rounded-full px-2 py-0.5 text-xs', badge.cls)}>{badge.label}</span>
        {run.status === 'running' && (
          <button onClick={handleCancel} className="ml-auto rounded-md px-2 py-1 text-xs text-red-400 hover:bg-red-950/30">
            cancel
          </button>
        )}
      </div>

      {/* Prompt */}
      <div className="border-b border-zinc-900 px-6 py-2 text-xs text-zinc-500">
        prompt: <span className="text-zinc-400">{input.prompt.slice(0, 100)}</span>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Timeline */}
        <div className="w-80 shrink-0 overflow-auto border-r border-zinc-800">
          <PipelineTimeline
            steps={steps}
            onStepClick={setActiveStep}
            activeStepId={activeStep}
          />

          {/* Approval buttons */}
          {run.status === 'awaiting_approval' && steps.filter((s) => s.status === 'pending').length > 0 && (
            <div className="border-t border-zinc-800 p-4">
              <div className="mb-2 text-xs text-yellow-400">승인 대기 중</div>
              {steps.filter((s) => s.status === 'pending').map((s) => (
                <button
                  key={s.step_id}
                  onClick={() => handleApprove(s.step_id)}
                  className="mt-1 w-full rounded-md bg-yellow-900/30 py-1.5 text-xs text-yellow-300 hover:bg-yellow-900/50"
                >
                  approve: {s.step_id}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Agent output */}
        <div className="flex-1">
          {activeStepRun?.agent_id ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-500">
                {activeStep} · live output
              </div>
              <div className="flex-1">
                <AgentTerminal agentId={activeStepRun.agent_id} />
              </div>
            </div>
          ) : activeStep ? (
            <div className="p-6">
              <div className="mb-2 text-xs font-medium text-zinc-400">{activeStep}</div>
              {steps.filter((s) => s.step_id === activeStep).map((s, i) => (
                <div key={i} className="mt-2 rounded-md border border-zinc-800 p-3">
                  <div className="mb-1 text-xs text-zinc-500">status: {s.status}</div>
                  {s.output && (
                    <pre className="mt-2 max-h-96 overflow-auto rounded bg-zinc-900 p-2 font-[var(--font-mono)] text-xs text-zinc-400">
                      {s.output.slice(0, 2000)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-zinc-600">
              스텝을 선택해서 상세 보기
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
