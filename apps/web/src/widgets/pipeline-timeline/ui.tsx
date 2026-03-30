import { cn } from '@/shared/lib/cn'

interface StepRunInfo {
  step_id: string
  fan_index: number | null
  status: string
  agent_id: string | null
  started_at: string | null
  ended_at: string | null
  structured: string | null
}

const statusIcon: Record<string, string> = {
  pending: '○',
  running: '●',
  completed: '✓',
  failed: '✗',
  skipped: '—',
  cancelled: '—',
  awaiting_approval: '⏸',
}

const statusColor: Record<string, string> = {
  pending: 'text-zinc-600',
  running: 'text-emerald-400',
  completed: 'text-emerald-600',
  failed: 'text-red-400',
  skipped: 'text-zinc-700',
  cancelled: 'text-zinc-600',
  awaiting_approval: 'text-yellow-400',
}

const lineColor: Record<string, string> = {
  pending: 'bg-zinc-800',
  running: 'bg-emerald-500',
  completed: 'bg-emerald-800',
  failed: 'bg-red-800',
  skipped: 'bg-zinc-800',
  cancelled: 'bg-zinc-800',
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
  // fan_out 그룹핑: 같은 step_id의 여러 fan_index
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
            {/* 메인 스텝 */}
            <button
              onClick={() => onStepClick?.(stepId)}
              className={cn(
                'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-900/50',
                activeStepId === stepId && 'bg-zinc-900/50',
              )}
            >
              {/* 타임라인 라인 + 아이콘 */}
              <div className="flex flex-col items-center pt-0.5">
                <span className={cn('text-sm', statusColor[overallStatus])}>
                  {statusIcon[overallStatus]}
                </span>
                {!isLast && (
                  <div className={cn('mt-1 w-px flex-1 min-h-[20px]', lineColor[overallStatus])} />
                )}
              </div>

              {/* 내용 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-medium text-zinc-200">{stepId}</span>
                  <span className="text-xs text-zinc-600">{overallStatus}</span>
                  <span className="ml-auto font-[var(--font-mono)] text-xs text-zinc-600">
                    {formatElapsed(primaryRun.started_at, primaryRun.ended_at)}
                  </span>
                </div>

                {/* fan-out 서브 아이템 */}
                {isFanOut && (
                  <div className="mt-1.5 space-y-1">
                    {runs.map((run, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs">
                        <span className={cn(statusColor[run.status])}>
                          {statusIcon[run.status]}
                        </span>
                        <span className="text-zinc-400">
                          #{run.fan_index ?? i}
                        </span>
                        <span className="font-[var(--font-mono)] text-zinc-600">
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
