import { Link } from 'react-router'
import { Plus } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/shared/stores/app'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Button } from '@/shared/ui/button'
import type { Task } from '@metronome/types'

const columns = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'Running' },
  { key: 'completed', label: 'Done' },
  { key: 'failed', label: 'Failed' },
] as const

function formatTokens(n: number) {
  if (n === 0) return ''
  if (n < 1000) return `${n}t`
  return `${(n / 1000).toFixed(1)}k`
}

function TaskCard({ task }: { task: Task }) {
  const subtasks = useAppStore(useShallow((s) => s.tasks.filter((t) => t.parent_id === task.id)))

  return (
    <Link
      to={`/tasks/${task.id}`}
      className="block rounded-md border border-border p-3 transition-colors hover:border-border/80 hover:bg-accent/50"
    >
      <div className="truncate text-sm text-foreground">{task.title}</div>
      {subtasks.length > 0 && (
        <div className="mt-2 space-y-1">
          {subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <StatusIcon status={sub.status} className="size-3" />
              <span className="truncate">{sub.title}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        {task.agent_id && <span>{task.status === 'in_progress' ? 'running' : ''}</span>}
        {task.total_tokens > 0 && (
          <span className="ml-auto font-mono">{formatTokens(task.total_tokens)}</span>
        )}
      </div>
    </Link>
  )
}

export function TasksPage() {
  const tasks = useAppStore(useShallow((s) => s.tasks.filter((t) => !t.parent_id)))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Tasks</h1>
        <Button asChild variant="secondary" size="sm">
          <Link to="/chat">
            <Plus size={14} />
            new task
          </Link>
        </Button>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map(({ key, label }) => {
          const col = tasks.filter((t) => t.status === key)
          return (
            <div key={key} className="flex w-64 shrink-0 flex-col">
              <div className="mb-3 flex items-center gap-2 px-1">
                <StatusIcon status={key} className="size-3" />
                <span className="text-xs font-medium text-muted-foreground">{label}</span>
                <span className="ml-auto text-xs text-muted-foreground/60">{col.length}</span>
              </div>
              <div className="flex-1 space-y-2 overflow-auto">
                {col.map((task) => (
                  <TaskCard key={task.id} task={task} />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
