import { Link } from 'react-router'
import { useAppStore } from '@/shared/stores/app'
import { cn } from '@/shared/lib/cn'
import type { Task } from '@metronome/types'

const columns = [
  { key: 'pending', label: 'Pending', icon: '○', color: 'text-zinc-500' },
  { key: 'in_progress', label: 'Running', icon: '●', color: 'text-emerald-400' },
  { key: 'completed', label: 'Done', icon: '✓', color: 'text-zinc-400' },
  { key: 'failed', label: 'Failed', icon: '✗', color: 'text-red-400' },
] as const

function formatTokens(n: number) {
  if (n === 0) return ''
  if (n < 1000) return `${n}t`
  return `${(n / 1000).toFixed(1)}k`
}

function TaskCard({ task }: { task: Task }) {
  const subtasks = useAppStore((s) => s.tasks.filter((t) => t.parent_id === task.id))

  return (
    <Link
      to={`/tasks/${task.id}`}
      className="block rounded-md border border-zinc-800 p-3 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50"
    >
      <div className="truncate text-sm text-zinc-200">{task.title}</div>
      {subtasks.length > 0 && (
        <div className="mt-2 space-y-1">
          {subtasks.map((sub) => (
            <div key={sub.id} className="flex items-center gap-1.5 text-xs text-zinc-500">
              <span className={cn(
                sub.status === 'in_progress' && 'text-emerald-400',
                sub.status === 'completed' && 'text-zinc-400',
                sub.status === 'failed' && 'text-red-400',
              )}>
                {sub.status === 'in_progress' ? '●' : sub.status === 'completed' ? '✓' : sub.status === 'failed' ? '✗' : '○'}
              </span>
              <span className="truncate">{sub.title}</span>
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
        {task.agent_id && <span className="text-zinc-500">{task.status === 'in_progress' ? 'running' : ''}</span>}
        {task.total_tokens > 0 && (
          <span className="ml-auto font-[var(--font-mono)]">{formatTokens(task.total_tokens)}</span>
        )}
      </div>
    </Link>
  )
}

export function TasksPage() {
  const tasks = useAppStore((s) => s.tasks.filter((t) => !t.parent_id))

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <h1 className="text-sm font-semibold">Tasks</h1>
        <Link
          to="/chat"
          className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
        >
          + new task
        </Link>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto p-4">
        {columns.map(({ key, label, icon, color }) => {
          const col = tasks.filter((t) => t.status === key)
          return (
            <div key={key} className="flex w-64 shrink-0 flex-col">
              <div className="mb-3 flex items-center gap-2 px-1">
                <span className={cn('text-xs', color)}>{icon}</span>
                <span className="text-xs font-medium text-zinc-400">{label}</span>
                <span className="ml-auto text-xs text-zinc-600">{col.length}</span>
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
