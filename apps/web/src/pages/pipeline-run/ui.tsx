import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { FileCode } from 'lucide-react'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { PipelineTimeline } from '@/widgets/pipeline-timeline/ui'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { PipelineRun, StepRun } from '@metronome/types'

type StepRunWithModel = StepRun & { agent_model?: string | null }

const statusToInternal: Record<string, string> = {
  running: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  interrupted: 'interrupted',
  retrying: 'pending',
  awaiting_approval: 'awaiting_approval',
}

export function PipelineRunPage() {
  const { id } = useParams()
  const [run, setRun] = useState<PipelineRun | null>(null)
  const [steps, setSteps] = useState<StepRunWithModel[]>([])
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [fileChanges, setFileChanges] = useState<Array<{ file_path: string; step_id: string; change_type: string }>>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      try {
        const [runData, stepsData] = await Promise.all([
          api.pipelines.getRun(id!),
          api.pipelines.getRunSteps(id!),
        ])
        setRun(runData)
        setSteps(stepsData)
        if (runData.status === 'completed' || runData.status === 'failed') {
          api.pipelines.getRunFiles(id!).then(setFileChanges).catch(() => {})
        }
      } catch {
        setError('failed to load pipeline run')
      }
    }
    fetchData()

    wsClient.subscribe([`pipeline:${id}`])
    const unsub = wsClient.onMessage((msg) => {
      if (msg.topic !== `pipeline:${id}`) return
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

  if (!run) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-3 border-b border-border px-6 py-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
        <div className="flex-1 p-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="size-4 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-10" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const activeStepRun = steps.find((s) => s.step_id === activeStep && s.status === 'running')
  const input = JSON.parse(run.input) as { prompt: string; cwd: string }

  async function handleCancel() {
    await api.pipelines.cancelRun(id!)
  }

  async function handleApprove(stepId: string) {
    await api.pipelines.approveStep(id!, stepId)
  }

  async function handleReject(stepId: string) {
    await api.pipelines.rejectStep(id!, stepId)
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Link to="/pipelines/editor" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Pipelines</Link>
        <h1 className="text-sm font-semibold">{run.pipeline_id}</h1>
        <span className="font-mono text-xs text-muted-foreground">#{id?.slice(0, 8)}</span>
        <Badge variant="secondary" className="gap-1.5">
          <StatusIcon status={statusToInternal[run.status] || 'pending'} className="size-3" />
          {run.status === 'running' ? 'running' : run.status}
        </Badge>
        {run.status === 'running' && (
          <Button onClick={handleCancel} variant="destructive" size="xs" className="ml-auto">
            cancel
          </Button>
        )}
      </div>

      <div className="border-b border-border px-6 py-2 text-xs text-muted-foreground">
        prompt: <span className="text-foreground/70">{input.prompt.slice(0, 100)}</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 overflow-auto border-r border-border">
          <PipelineTimeline
            steps={steps}
            onStepClick={setActiveStep}
            activeStepId={activeStep}
          />

          {fileChanges.length > 0 && (
            <div className="border-t border-border p-4">
              <div className="mb-2 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/50">
                <FileCode size={12} /> changed files ({fileChanges.length})
              </div>
              <div className="space-y-0.5">
                {fileChanges.map((f, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-foreground/70 truncate">{f.file_path}</span>
                    <span className="ml-auto text-muted-foreground/50">{f.step_id}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {run.status === 'awaiting_approval' && steps.filter((s) => s.status === 'pending').length > 0 && (
            <div className="border-t border-border p-4">
              <div className="mb-2 text-xs text-yellow-400">승인 대기 중</div>
              {steps.filter((s) => s.status === 'pending').map((s) => (
                <div key={s.step_id} className="mt-1 flex gap-1">
                  <Button
                    onClick={() => handleApprove(s.step_id)}
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-emerald-400"
                  >
                    approve
                  </Button>
                  <Button
                    onClick={() => handleReject(s.step_id)}
                    variant="secondary"
                    size="sm"
                    className="flex-1 text-red-400"
                  >
                    reject
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1">
          {activeStepRun?.agent_id ? (
            <div className="flex h-full flex-col">
              <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                {activeStep} · live output
              </div>
              <div className="flex-1">
                <AgentTerminal agentId={activeStepRun.agent_id} />
              </div>
            </div>
          ) : activeStep ? (
            <div className="p-6">
              <div className="mb-2 text-xs font-medium text-muted-foreground">{activeStep}</div>
              {steps.filter((s) => s.step_id === activeStep).map((s, i) => (
                <div key={i} className="mt-2 rounded-md border border-border p-3">
                  <div className="mb-1 text-xs text-muted-foreground">status: {s.status}</div>
                  {s.output && (
                    <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-card p-2 font-mono text-xs text-foreground/70">
                      {s.output.slice(0, 2000)}
                    </pre>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              스텝을 선택해서 상세 보기
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
