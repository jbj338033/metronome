import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Rocket, Loader2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { cn } from '@/shared/lib/cn'
import type { Pipeline } from '@metronome/types'

type Mode = 'auto' | 'template' | 'direct'

export function LaunchPage() {
  const [prompt, setPrompt] = useState('')
  const [cwd, setCwd] = useState('')
  const [mode, setMode] = useState<Mode>('auto')
  const [template, setTemplate] = useState<string | null>(null)
  const [templates, setTemplates] = useState<Array<Pipeline & { source: string }>>([])
  const [agentTypeId, setAgentTypeId] = useState('claude-code')
  const [agentTypes, setAgentTypes] = useState<Array<{ id: string; name: string }>>([])
  const [launching, setLaunching] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    api.pipelines.list().then(setTemplates)
    api.agents.types().then(setAgentTypes)
    setCwd(import.meta.env.DEV ? '/tmp/metronome-test' : '')
  }, [])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [mode])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`
  }

  async function handleLaunch() {
    if (!prompt.trim() || !cwd.trim() || launching) return
    setLaunching(true)

    try {
      let runId: string

      if (mode === 'auto') {
        const res = await api.pipelines.runDynamic({ prompt, cwd })
        runId = res.runId
      } else if (mode === 'template' && template) {
        const res = await api.pipelines.run(template, { prompt, cwd })
        runId = res.runId
      } else {
        // direct mode — chat send
        const res = await api.chat.send({
          content: prompt,
          agent_type_id: agentTypeId,
          cwd,
          auto_spawn: true,
        })
        if (res.agentId) {
          wsClient.subscribe([`agent:${res.agentId}`])
        }
        navigate(`/live`)
        return
      }

      navigate(`/live/${runId}`)
    } catch (err) {
      console.error(err)
    } finally {
      setLaunching(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleLaunch()
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Launch</h1>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="w-full max-w-2xl space-y-4">
          {/* Mode selector */}
          <div className="flex gap-1 rounded-lg bg-secondary p-1">
            {([
              { id: 'auto' as const, label: '🚀 Auto', desc: 'orchestrator가 자동 설계' },
              { id: 'template' as const, label: '📋 Template', desc: '파이프라인 선택' },
              { id: 'direct' as const, label: '💬 Direct', desc: '에이전트에 직접 명령' },
            ]).map((m) => (
              <button
                key={m.id}
                onClick={() => setMode(m.id)}
                className={cn(
                  'flex-1 rounded-md px-3 py-2 text-center text-xs transition-colors',
                  mode === m.id
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <div className="font-medium">{m.label}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground/60">{m.desc}</div>
              </button>
            ))}
          </div>

          {/* Prompt */}
          <textarea
            ref={textareaRef}
            value={prompt}
            onChange={(e) => { setPrompt(e.target.value); autoResize() }}
            onKeyDown={handleKeyDown}
            placeholder="무엇을 만들까요?"
            rows={3}
            className="w-full resize-none rounded-lg border border-input bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />

          {/* Options */}
          <div className="flex gap-2">
            <Input
              value={cwd}
              onChange={(e) => setCwd(e.target.value)}
              placeholder="working directory"
              className="flex-1 h-9 text-xs"
            />

            {mode === 'template' && (
              <select
                value={template || ''}
                onChange={(e) => setTemplate(e.target.value || null)}
                className="h-9 rounded-md border border-input bg-secondary px-2 text-xs outline-none"
              >
                <option value="">select pipeline...</option>
                {templates.map((t) => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            )}

            {mode === 'direct' && (
              <select
                value={agentTypeId}
                onChange={(e) => setAgentTypeId(e.target.value)}
                className="h-9 rounded-md border border-input bg-secondary px-2 text-xs outline-none"
              >
                {agentTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
          </div>

          {/* Launch button */}
          <Button
            onClick={handleLaunch}
            disabled={!prompt.trim() || !cwd.trim() || launching || (mode === 'template' && !template)}
            className="w-full"
            size="lg"
          >
            {launching ? <Loader2 className="animate-spin" /> : <Rocket size={16} />}
            {mode === 'auto' ? 'auto launch' : mode === 'template' ? 'run pipeline' : 'send to agent'}
          </Button>

          <p className="text-center text-xs text-muted-foreground/50">
            ⌘+Enter to launch
          </p>
        </div>
      </div>
    </div>
  )
}
