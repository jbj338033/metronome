import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router'
import { useAppStore } from '@/shared/stores/app'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import { cn } from '@/shared/lib/cn'

const statusBadge: Record<string, { label: string; cls: string }> = {
  pending: { label: 'pending', cls: 'bg-zinc-800 text-zinc-400' },
  in_progress: { label: 'running', cls: 'bg-emerald-900/50 text-emerald-400' },
  completed: { label: 'done', cls: 'bg-zinc-800 text-zinc-300' },
  failed: { label: 'failed', cls: 'bg-red-900/30 text-red-400' },
  cancelled: { label: 'cancelled', cls: 'bg-zinc-800 text-zinc-500' },
}

function formatTokens(n: number) {
  if (n === 0) return '—'
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

export function TaskDetailPage() {
  const { id } = useParams()
  const task = useAppStore((s) => s.tasks.find((t) => t.id === id))
  const subtasks = useAppStore((s) => s.tasks.filter((t) => t.parent_id === id))
  const [messages, setMessages] = useState<any[]>([])
  const [stdinInput, setStdinInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!id) return
    api.tasks.messages(id).then(setMessages)
    wsClient.subscribe([`task:${id}`])
    if (task?.agent_id) {
      wsClient.subscribe([`agent:${task.agent_id}`])
    }
    return () => {
      wsClient.unsubscribe([`task:${id}`])
      if (task?.agent_id) {
        wsClient.unsubscribe([`agent:${task.agent_id}`])
      }
    }
  }, [id, task?.agent_id])

  function handleStdinSend() {
    const content = stdinInput.trim()
    if (!content || !task?.agent_id) return
    wsClient.sendAgentInput(task.agent_id, content)
    setStdinInput('')
    inputRef.current?.focus()
  }

  if (!task) {
    return <div className="p-6 text-sm text-zinc-500">task not found</div>
  }

  const badge = statusBadge[task.status] || statusBadge.pending

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <Link to="/tasks" className="text-xs text-zinc-500 hover:text-zinc-300">← Tasks</Link>
        <h1 className="flex-1 truncate text-sm font-semibold">{task.title}</h1>
        <span className={cn('rounded-full px-2 py-0.5 text-xs', badge.cls)}>{badge.label}</span>
      </div>

      {/* Meta */}
      <div className="flex gap-4 border-b border-zinc-900 px-6 py-2 text-xs text-zinc-500">
        <span>tokens: <span className="font-[var(--font-mono)] text-zinc-400">{formatTokens(task.total_tokens)}</span></span>
        {task.agent_id && <span>agent: <span className="text-zinc-400">{task.agent_id.slice(0, 8)}</span></span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: subtasks + messages */}
        <div className="flex flex-1 flex-col overflow-auto">
          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div className="border-b border-zinc-900 px-6 py-3">
              <div className="mb-2 text-xs font-medium text-zinc-500">subtasks</div>
              <div className="space-y-1">
                {subtasks.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/tasks/${sub.id}`}
                    className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-zinc-900"
                  >
                    <span className={cn(
                      'text-xs',
                      sub.status === 'in_progress' ? 'text-emerald-400' : sub.status === 'completed' ? 'text-zinc-400' : sub.status === 'failed' ? 'text-red-400' : 'text-zinc-600',
                    )}>
                      {sub.status === 'in_progress' ? '●' : sub.status === 'completed' ? '✓' : sub.status === 'failed' ? '✗' : '○'}
                    </span>
                    <span className="flex-1 truncate text-zinc-300">{sub.title}</span>
                    <span className="font-[var(--font-mono)] text-xs text-zinc-600">{formatTokens(sub.total_tokens)}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-auto p-6">
            {messages.map((msg: any) => (
              <div key={msg.id} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  msg.role === 'user' ? 'bg-zinc-800 text-zinc-100' : 'bg-zinc-900 text-zinc-300',
                )}>
                  <pre className="whitespace-pre-wrap font-[inherit]">{msg.content}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: agent terminal */}
        {task.agent_id && task.status === 'in_progress' && (
          <div className="flex w-[400px] shrink-0 flex-col border-l border-zinc-800">
            <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-500">
              live output
            </div>
            <div className="flex-1">
              <AgentTerminal agentId={task.agent_id} />
            </div>
            {/* stdin */}
            <div className="border-t border-zinc-800 p-2">
              <div className="flex gap-1">
                <span className="py-1 text-xs text-zinc-600">&gt;</span>
                <input
                  ref={inputRef}
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStdinSend()}
                  placeholder="agent에 입력..."
                  className="flex-1 bg-transparent text-xs text-zinc-300 placeholder-zinc-700 outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
