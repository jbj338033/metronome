import { useEffect } from 'react'
import { Link } from 'react-router'
import { useAppStore } from '@/shared/stores/app'
import { cn } from '@/shared/lib/cn'
import type { Task } from '@metronome/types'

const statusIcon: Record<string, string> = {
  pending: '○',
  in_progress: '●',
  completed: '✓',
  failed: '✗',
  cancelled: '—',
  interrupted: '⚠',
}

const statusColor: Record<string, string> = {
  pending: 'text-zinc-500',
  in_progress: 'text-emerald-400',
  completed: 'text-zinc-400',
  failed: 'text-red-400',
  cancelled: 'text-zinc-600',
  interrupted: 'text-yellow-400',
}

function formatDuration(created: string) {
  const ms = Date.now() - new Date(created + 'Z').getTime()
  const m = Math.floor(ms / 60000)
  if (m < 1) return '<1m'
  if (m < 60) return `${m}m`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function formatTokens(n: number) {
  if (n === 0) return '—'
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

function TaskRow({ task, isSubtask }: { task: Task; isSubtask?: boolean }) {
  const subtasks = useAppStore((s) => s.tasks.filter((t) => t.parent_id === task.id))

  return (
    <>
      <Link
        to={`/tasks/${task.id}`}
        className={cn(
          'group flex items-center gap-3 border-b border-zinc-900 px-4 py-2 transition-colors duration-150 hover:bg-zinc-900/50',
          isSubtask && 'pl-10',
        )}
      >
        <span className={cn('w-4 text-center text-xs', statusColor[task.status])}>
          {statusIcon[task.status]}
        </span>
        <span className="flex-1 truncate text-sm text-zinc-200">
          {task.title}
        </span>
        {task.agent_id && (
          <span className="text-xs text-zinc-500">
            {task.status === 'in_progress' ? formatDuration(task.created_at) : ''}
          </span>
        )}
        <span className="w-12 text-right font-[var(--font-mono)] text-xs text-zinc-600">
          {formatTokens(task.total_tokens)}
        </span>
      </Link>
      {subtasks.map((sub) => (
        <TaskRow key={sub.id} task={sub} isSubtask />
      ))}
    </>
  )
}

export function DashboardPage() {
  const { tasks, runningAgents, initialized, init } = useAppStore()

  useEffect(() => { init() }, [init])

  if (!initialized) {
    return <div className="p-6 text-sm text-zinc-500">loading...</div>
  }

  const rootTasks = tasks.filter((t) => !t.parent_id)
  const running = tasks.filter((t) => t.status === 'in_progress').length
  const pending = tasks.filter((t) => t.status === 'pending').length
  const done = tasks.filter((t) => t.status === 'completed').length
  const totalTokens = tasks.reduce((sum, t) => sum + t.total_tokens, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-3">
        <h1 className="text-sm font-semibold">Dashboard</h1>
        <Link
          to="/chat"
          className="rounded-md bg-zinc-800 px-3 py-1 text-xs text-zinc-300 transition-colors hover:bg-zinc-700"
        >
          + new task
        </Link>
      </div>

      <div className="flex gap-4 border-b border-zinc-900 px-6 py-2 text-xs">
        <span className="text-emerald-400">● {running} running</span>
        <span className="text-zinc-500">○ {pending} pending</span>
        <span className="text-zinc-400">✓ {done} done</span>
        <span className="ml-auto font-[var(--font-mono)] text-zinc-600">
          {formatTokens(totalTokens)} tokens
        </span>
      </div>

      {rootTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-sm text-zinc-500">아직 태스크가 없어요</p>
          <Link
            to="/chat"
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:bg-zinc-700"
          >
            채팅으로 시작하기
          </Link>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {rootTasks.map((task) => (
            <TaskRow key={task.id} task={task} />
          ))}
        </div>
      )}
    </div>
  )
}
