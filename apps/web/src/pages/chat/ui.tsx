import { useState, useEffect, useRef } from 'react'
import { useAppStore } from '@/shared/stores/app'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { MessageBubble } from '@/entities/message/ui'
import { TaskCardInline } from '@/entities/task/ui'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
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
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const currentTask = useAppStore((s) => s.tasks.find((t) => t.id === currentTaskId))

  useEffect(() => {
    api.agents.types().then(setAgentTypes)
    // 기본 cwd
    setCwd(import.meta.env.DEV ? '/tmp/metronome-test' : '')
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function handleSend() {
    const content = input.trim()
    if (!content || sending) return

    setSending(true)
    setInput('')

    try {
      if (currentTaskId && currentAgentId) {
        // 기존 태스크에 후속 메시지 (stdin 입력)
        const { messageId } = await api.chat.message({
          task_id: currentTaskId,
          content,
          agent_id: currentAgentId,
        })
        setMessages((prev) => [...prev, { id: messageId, role: 'user', content, created_at: new Date().toISOString() }])
      } else {
        // 새 태스크 생성 + 에이전트 spawn
        const { taskId, messageId, agentId } = await api.chat.send({
          content,
          agent_type_id: agentTypeId,
          cwd: cwd || undefined,
          auto_spawn: !!cwd,
        })
        setCurrentTaskId(taskId)
        setCurrentAgentId(agentId)
        setMessages((prev) => [...prev, { id: messageId, role: 'user', content, created_at: new Date().toISOString() }])

        // WebSocket 구독
        if (agentId) {
          wsClient.subscribe([`agent:${agentId}`, `task:${taskId}`])
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setSending(false)
      inputRef.current?.focus()
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
    inputRef.current?.focus()
  }

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <h1 className="text-sm font-semibold">Chat</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={agentTypeId}
            onChange={(e) => setAgentTypeId(e.target.value)}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none"
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
            className="w-48 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
          />
          {currentTaskId && (
            <button
              onClick={handleNewChat}
              className="rounded-md bg-zinc-800 px-2 py-1 text-xs text-zinc-400 hover:bg-zinc-700"
            >
              new chat
            </button>
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
                <p className="text-sm text-zinc-600">에이전트에게 지시해보세요</p>
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
          <div className="border-t border-zinc-800 p-4">
            <div className="flex gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={currentAgentId ? '에이전트에 입력 보내기...' : '무엇을 만들까요?'}
                rows={1}
                className="flex-1 resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-zinc-600"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={cn(
                  'rounded-md px-4 py-2 text-sm transition-colors',
                  input.trim() && !sending
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    : 'bg-zinc-800 text-zinc-600',
                )}
              >
                {sending ? '...' : '⏎'}
              </button>
            </div>
          </div>
        </div>

        {/* Agent terminal (우측 패널, 에이전트 실행 중일 때만) */}
        {currentAgentId && (
          <div className="w-[400px] shrink-0 border-l border-zinc-800">
            <div className="border-b border-zinc-800 px-3 py-2 text-xs text-zinc-500">
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
