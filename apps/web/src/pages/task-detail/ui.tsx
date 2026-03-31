import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router'
import { FileQuestion, ArrowLeft } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'
import { useTaskStore } from '@/entities/task/model/store'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'

function formatTokens(n: number) {
  if (n === 0) return '—'
  if (n < 1000) return String(n)
  return `${(n / 1000).toFixed(1)}k`
}

export function TaskDetailPage() {
  const { id } = useParams()
  const task = useTaskStore((s) => s.tasks.find((t) => t.id === id))
  const subtasks = useTaskStore(useShallow((s) => s.tasks.filter((t) => t.parent_id === id)))
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
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3">
        <FileQuestion size={32} strokeWidth={1} className="text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">task not found</p>
        <Button asChild variant="secondary" size="sm">
          <Link to="/tasks">
            <ArrowLeft size={14} />
            back to tasks
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <Link to="/tasks" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Tasks</Link>
        <h1 className="flex-1 truncate text-sm font-semibold">{task.title}</h1>
        <Badge variant="secondary" className="gap-1.5">
          <StatusIcon status={task.status} className="size-3" />
          {task.status === 'in_progress' ? 'running' : task.status}
        </Badge>
      </div>

      {/* Meta */}
      <div className="flex gap-4 border-b border-border px-6 py-2 text-xs text-muted-foreground">
        <span>tokens: <span className="font-mono text-foreground/70">{formatTokens(task.total_tokens)}</span></span>
        {task.agent_id && <span>agent: <span className="font-mono text-foreground/70">{task.agent_id.slice(0, 8)}</span></span>}
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: subtasks + messages */}
        <div className="flex flex-1 flex-col overflow-auto">
          {/* Subtasks */}
          {subtasks.length > 0 && (
            <div className="border-b border-border px-6 py-3">
              <div className="mb-2 text-xs font-medium text-muted-foreground">subtasks</div>
              <div className="space-y-1">
                {subtasks.map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/tasks/${sub.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-accent transition-colors"
                  >
                    <StatusIcon status={sub.status} className="size-3" />
                    <span className="flex-1 truncate text-foreground/80">{sub.title}</span>
                    <span className="font-mono text-xs text-muted-foreground">{formatTokens(sub.total_tokens)}</span>
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
                  msg.role === 'user' ? 'bg-secondary text-secondary-foreground' : 'border-l-2 border-muted bg-card text-card-foreground',
                )}>
                  <pre className="whitespace-pre-wrap font-[inherit]">{msg.content}</pre>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: agent terminal */}
        {task.agent_id && task.status === 'in_progress' && (
          <div className="flex w-[400px] shrink-0 flex-col border-l border-border">
            <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
              live output
            </div>
            <div className="flex-1">
              <AgentTerminal agentId={task.agent_id} />
            </div>
            {/* stdin */}
            <div className="border-t border-border p-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground font-mono">&gt;</span>
                <input
                  ref={inputRef}
                  value={stdinInput}
                  onChange={(e) => setStdinInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStdinSend()}
                  placeholder="agent에 입력..."
                  className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground outline-none"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
