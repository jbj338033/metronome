import { useState, useEffect, useRef } from 'react'
import { ArrowUp, Loader2, Plus } from 'lucide-react'
import { useTaskStore } from '@/entities/task/model/store'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { MessageBubble } from '@/entities/message/ui'
import { TaskCardInline } from '@/entities/task/ui'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/cn'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  created_at: string
}

export function ChatPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [agentTypeId, setAgentTypeId] = useState('claude-code')
  const [cwd, setCwd] = useState('')
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null)
  const [currentAgentId, setCurrentAgentId] = useState<string | null>(null)
  const [agentTypes, setAgentTypes] = useState<Array<{ id: string; name: string }>>([])
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const currentTask = useTaskStore((s) => s.tasks.find((t) => t.id === currentTaskId))

  useEffect(() => {
    api.agents.types().then(setAgentTypes)
    setCwd(import.meta.env.DEV ? '/tmp/metronome-test' : '')
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      if (currentTaskId && currentAgentId) {
        const { messageId } = await api.chat.message({
          task_id: currentTaskId,
          content,
          agent_id: currentAgentId,
        })
        setMessages((prev) => [...prev, { id: messageId, role: 'user', content, created_at: new Date().toISOString() }])
      } else {
        const { taskId, messageId, agentId } = await api.chat.send({
          content,
          agent_type_id: agentTypeId,
          cwd: cwd || undefined,
          auto_spawn: !!cwd,
        })
        setCurrentTaskId(taskId)
        setCurrentAgentId(agentId)
        setMessages((prev) => [...prev, { id: messageId, role: 'user', content, created_at: new Date().toISOString() }])

        if (agentId) {
          wsClient.subscribe([`agent:${agentId}`, `task:${taskId}`])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleNewChat() {
    setCurrentTaskId(null)
    setCurrentAgentId(null)
    setMessages([])
    textareaRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Chat</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={agentTypeId}
            onChange={(e) => setAgentTypeId(e.target.value)}
            className="h-8 rounded-md border border-input bg-secondary px-2 text-xs text-secondary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {agentTypes.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={cwd}
            onChange={(e) => setCwd(e.target.value)}
            placeholder="working directory"
            className="h-8 w-48 rounded-md border border-input bg-secondary px-2 text-xs text-secondary-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {currentTaskId && (
            <Button onClick={handleNewChat} variant="secondary" size="sm">
              <Plus size={14} />
              new chat
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Messages */}
        <div className="flex flex-1 flex-col">
          <div className="flex-1 space-y-3 overflow-auto p-6">
            {messages.length === 0 && !currentTaskId && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">에이전트에게 지시해보세요</p>
              </div>
            )}

            {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  timestamp={msg.created_at}
                />
              ))}

            {currentTask && (
              <TaskCardInline
                id={currentTask.id}
                title={currentTask.title}
                status={currentTask.status}
                blueprint={currentTask.agent_id ? agentTypeId : null}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); autoResize() }}
                onKeyDown={handleKeyDown}
                placeholder={currentAgentId ? '에이전트에 입력 보내기...' : '무엇을 만들까요?'}
                rows={1}
                className="flex-1 resize-none rounded-md border border-input bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <Button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                size="icon"
                className="shrink-0"
              >
                {sending ? <Loader2 className="animate-spin" /> : <ArrowUp />}
              </Button>
            </div>
          </div>
        </div>

        {/* Agent terminal */}
        {currentAgentId && (
          <div className="w-[400px] shrink-0 border-l border-border">
            <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
              {agentTypeId} · live output
            </div>
            <div className="h-[calc(100%-33px)]">
              <AgentTerminal agentId={currentAgentId} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
