import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'

interface StepRunInfo {
  step_id: string
  fan_index: number | null
  status: string
  agent_id: string | null
  started_at: string | null
  ended_at: string | null
  structured: string | null
}

const statusMap: Record<string, string> = {
  running: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  pending: 'pending',
  skipped: 'cancelled',
  cancelled: 'cancelled',
  awaiting_approval: 'awaiting_approval',
}

const lineColor: Record<string, string> = {
  pending: 'bg-muted',
  running: 'bg-emerald-500',
  completed: 'bg-emerald-800',
  failed: 'bg-red-800',
  skipped: 'bg-muted',
  cancelled: 'bg-muted',
  awaiting_approval: 'bg-yellow-800',
}

function formatElapsed(start: string | null, end: string | null) {
  if (!start) return '—'
  const from = new Date(start + 'Z').getTime()
  const to = end ? new Date(end + 'Z').getTime() : Date.now()
  const s = Math.floor((to - from) / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

interface PipelineTimelineProps {
  steps: StepRunInfo[]
  onStepClick?: (stepId: string) => void
  activeStepId?: string | null
}

export function PipelineTimeline({ steps, onStepClick, activeStepId }: PipelineTimelineProps) {
  const grouped = new Map<string, StepRunInfo[]>()
  for (const step of steps) {
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
        const allCompleted = runs.every((r) => r.status === 'completed')
        const anyRunning = runs.some((r) => r.status === 'running')
        const anyFailed = runs.some((r) => r.status === 'failed')
        const overallStatus = anyFailed ? 'failed' : anyRunning ? 'running' : allCompleted ? 'completed' : primaryRun.status

        return (
          <div key={stepId}>
            <button
              onClick={() => onStepClick?.(stepId)}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/50',
                activeStepId === stepId && 'bg-accent/50',
              )}
            >
              <div className="flex flex-col items-center pt-0.5">
                <StatusIcon status={statusMap[overallStatus] || 'pending'} className="size-4" />
                {!isLast && (
                  <div className={cn('mt-1 w-px flex-1 min-h-[20px]', lineColor[overallStatus])} />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-foreground">{stepId}</span>
                  <span className="text-xs text-muted-foreground">{overallStatus}</span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground/60">
                    {formatElapsed(primaryRun.started_at, primaryRun.ended_at)}
                  </span>
                </div>

                {isFanOut && (
                  <div className="mt-1.5 space-y-1">
                    {runs.map((run, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <StatusIcon status={statusMap[run.status] || 'pending'} className="size-3" />
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
              </div>
            </button>
          </div>
        )
      })}
    </div>
  )
}
