import { useEffect } from 'react'
import { Link } from 'react-router'
import { Plus, ListTodo } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useAppStore } from '@/shared/stores/app'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import type { Task } from '@metronome/types'

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
  const subtasks = useAppStore(useShallow((s) => s.tasks.filter((t) => t.parent_id === task.id)))

  return (
    <>
      <Link
        to={`/tasks/${task.id}`}
        className={cn(
          'group flex items-center gap-3 border-b border-border px-4 py-2 transition-colors duration-150 hover:bg-accent/50',
          isSubtask && 'pl-10',
        )}
      >
        <StatusIcon status={task.status} />
        <span className="flex-1 truncate text-sm text-foreground">
          {task.title}
        </span>
        {task.agent_id && (
          <span className="text-xs text-muted-foreground">
            {task.status === 'in_progress' ? formatDuration(task.created_at) : ''}
          </span>
        )}
        <span className="w-12 text-right font-mono text-xs text-muted-foreground/60">
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
  const { tasks, runningAgents, initialized, init } = useAppStore(useShallow((s) => ({
    tasks: s.tasks,
    runningAgents: s.runningAgents,
    initialized: s.initialized,
    init: s.init,
  })))

  useEffect(() => { init() }, [init])

  if (!initialized) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-6 py-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="flex gap-4 border-b border-border px-6 py-2.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
        <div className="flex-1 p-0">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3">
              <Skeleton className="size-3.5 rounded-full" />
              <Skeleton className="h-3.5 flex-1" />
              <Skeleton className="h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  const rootTasks = tasks.filter((t) => !t.parent_id)
  const running = tasks.filter((t) => t.status === 'in_progress').length
  const pending = tasks.filter((t) => t.status === 'pending').length
  const done = tasks.filter((t) => t.status === 'completed').length
  const totalTokens = tasks.reduce((sum, t) => sum + t.total_tokens, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Dashboard</h1>
        <Button asChild variant="secondary" size="sm">
          <Link to="/chat">
            <Plus size={14} />
            new task
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-4 border-b border-border px-6 py-2 text-xs">
        <span className="flex items-center gap-1.5 text-emerald-400"><StatusIcon status="in_progress" className="size-3" /> {running} running</span>
        <span className="flex items-center gap-1.5 text-muted-foreground"><StatusIcon status="pending" className="size-3" /> {pending} pending</span>
        <span className="flex items-center gap-1.5 text-muted-foreground"><StatusIcon status="completed" className="size-3" /> {done} done</span>
        <span className="ml-auto font-mono text-muted-foreground/60">
          {formatTokens(totalTokens)} tokens
        </span>
      </div>

      {rootTasks.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <ListTodo size={32} strokeWidth={1} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">아직 태스크가 없어요</p>
          <Button asChild variant="secondary" size="sm">
            <Link to="/chat">채팅으로 시작하기</Link>
          </Button>
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
