import { cn } from '@/shared/lib/cn'
import { StatusIcon, pipelineStatusMap } from '@/shared/lib/status'
import { formatElapsed } from '@/shared/lib/format'
import { ModelBadge } from '@/shared/ui/model-badge'

interface StepRunInfo {
  step_id: string
  fan_index: number | null
  status: string
  agent_id: string | null
  started_at: string | null
  ended_at: string | null
  structured: string | null
  verify_attempt: number | null
  parent_step_run_id: string | null
  agent_model?: string | null
}

const lineColor: Record<string, string> = {
  pending: 'bg-muted',
  running: 'bg-emerald-500',
  completed: 'bg-emerald-800',
  failed: 'bg-red-800',
  skipped: 'bg-muted',
  cancelled: 'bg-muted',
  retrying: 'bg-yellow-500',
  awaiting_approval: 'bg-yellow-800',
}

interface PipelineTimelineProps {
  steps: StepRunInfo[]
  onStepClick?: (stepId: string) => void
  activeStepId?: string | null
}

export function PipelineTimeline({ steps, onStepClick, activeStepId }: PipelineTimelineProps) {
  const mainSteps: StepRunInfo[] = []
  const verifySteps = new Map<string, StepRunInfo[]>()

  for (const step of steps) {
    if (step.step_id.endsWith('__verify')) {
      const parentId = step.step_id.replace('__verify', '')
      if (!verifySteps.has(parentId)) verifySteps.set(parentId, [])
      verifySteps.get(parentId)!.push(step)
    } else {
      mainSteps.push(step)
    }
  }

  const grouped = new Map<string, StepRunInfo[]>()
  for (const step of mainSteps) {
    const key = step.step_id
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(step)
  }

  const entries = [...grouped.entries()]

  return (
    <div className="space-y-0">
      {entries.map(([stepId, runs], idx) => {
        const isLast = idx === entries.length - 1
        const primaryRun = runs[0]
        const isFanOut = runs.length > 1 || runs[0].fan_index !== null
        const verifies = verifySteps.get(stepId) || []
        const allCompleted = runs.every((r) => r.status === 'completed')
        const anyRunning = runs.some((r) => r.status === 'running')
        const anyFailed = runs.some((r) => r.status === 'failed')
        const overallStatus = anyFailed ? 'failed' : anyRunning ? 'running' : allCompleted ? 'completed' : primaryRun.status

        return (
          <div key={stepId}>
            <button
              onClick={() => onStepClick?.(stepId)}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-1',
                activeStepId === stepId && 'bg-surface-1',
              )}
            >
              <div className="flex flex-col items-center pt-0.5">
                <StatusIcon status={pipelineStatusMap[overallStatus] || 'pending'} className="size-4" />
                {!isLast && (
                  <div className={cn('mt-1 w-px flex-1 min-h-[20px]', lineColor[overallStatus])} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{stepId}</span>
                  <span className="text-xs text-muted-foreground">{overallStatus}</span>
                  {primaryRun.agent_model && <ModelBadge model={primaryRun.agent_model} />}
                  <span className="ml-auto font-mono text-xs text-muted-foreground/60">
                    {formatElapsed(primaryRun.started_at, primaryRun.ended_at)}
                  </span>
                </div>

                {isFanOut && (
                  <div className="mt-1.5 space-y-1">
                    {runs.map((run, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <StatusIcon status={pipelineStatusMap[run.status] || 'pending'} className="size-3" />
                        <span className="text-foreground/60">
                          #{run.fan_index ?? i}
                        </span>
                        <span className="font-mono text-muted-foreground/60">
                          {formatElapsed(run.started_at, run.ended_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {verifies.length > 0 && (
                  <div className="mt-2 border-l-2 border-muted pl-3 space-y-1">
                    <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">verify</span>
                    {verifies.map((v, i) => {
                      const passed = v.status === 'completed' && v.structured
                        ? (() => { try { return JSON.parse(v.structured!).passed } catch { return null } })()
                        : null
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <StatusIcon status={pipelineStatusMap[v.status] || 'pending'} className="size-3" />
                          <span className="text-foreground/60">
                            attempt {(v.verify_attempt ?? i) + 1}
                          </span>
                          {passed !== null && (
                            <span className={passed ? 'text-emerald-400' : 'text-red-400'}>
                              {passed ? 'pass' : 'fail'}
                            </span>
                          )}
                          <span className="font-mono text-muted-foreground/60">
                            {formatElapsed(v.started_at, v.ended_at)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
