import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import { api } from '@/shared/api/client'
import { useTaskStore } from '@/entities/task/model/store'
import { StatusIcon } from '@/shared/lib/status'
import { cn } from '@/shared/lib/cn'
import type { PipelineRun } from '@metronome/types'

const statusMap: Record<string, string> = {
  running: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  interrupted: 'interrupted',
}

function formatTime(iso: string) {
  const d = new Date(iso + 'Z')
  const now = Date.now()
  const ms = now - d.getTime()
  if (ms < 60_000) return 'just now'
  if (ms < 3600_000) return `${Math.floor(ms / 60_000)}m ago`
  if (ms < 86400_000) return `${Math.floor(ms / 3600_000)}h ago`
  return d.toLocaleDateString()
}

function formatDuration(start: string, end: string | null) {
  if (!end) return '—'
  const ms = new Date(end + 'Z').getTime() - new Date(start + 'Z').getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

type Tab = 'runs' | 'tasks'

export function HistoryPage() {
  const [tab, setTab] = useState<Tab>('runs')
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const tasks = useTaskStore((s) => s.tasks)

  useEffect(() => {
    api.pipelines.listRuns().then(setRuns)
  }, [])

  const completedRuns = runs.filter((r) => r.status !== 'running' && r.status !== 'awaiting_approval')

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">History</h1>
        <div className="ml-auto flex gap-1">
          {(['runs', 'tasks'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs transition-colors',
                tab === t ? 'bg-secondary text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t === 'runs' ? 'pipeline runs' : 'tasks'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === 'runs' ? (
          completedRuns.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Clock size={32} strokeWidth={1} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">실행 기록이 없어요</p>
            </div>
          ) : (
            completedRuns.map((run) => {
              const input = JSON.parse(run.input) as { prompt: string }
              return (
                <Link
                  key={run.id}
                  to={`/live/${run.id}`}
                  className="flex items-center gap-3 border-b border-border px-6 py-3 hover:bg-accent/30 transition-colors"
                >
                  <StatusIcon status={statusMap[run.status] || 'pending'} className="size-4" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm text-foreground">{input.prompt}</div>
                    <div className="flex gap-2 mt-0.5 text-xs text-muted-foreground">
                      <span>{run.pipeline_id === '__orchestrated' ? 'auto' : run.pipeline_id}</span>
                      <span>{formatDuration(run.created_at, run.ended_at)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatTime(run.created_at)}</span>
                </Link>
              )
            })
          )
        ) : (
          tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3">
              <Clock size={32} strokeWidth={1} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">태스크가 없어요</p>
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 border-b border-border px-6 py-2.5"
              >
                <StatusIcon status={task.status} className="size-3.5" />
                <span className="flex-1 truncate text-sm text-foreground">{task.title}</span>
                {task.total_tokens > 0 && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {(task.total_tokens / 1000).toFixed(1)}k
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatTime(task.created_at)}</span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  )
}
