import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router'
import { Rocket, FileText, MessageSquare, Loader2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { Button } from '@/shared/ui/button'
import { Textarea } from '@/shared/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select'
import { DirectoryPicker } from '@/widgets/directory-picker/ui'
import { cn } from '@/shared/lib/cn'
import type { Pipeline } from '@metronome/types'

type Mode = 'auto' | 'template' | 'direct'

const modes = [
  { id: 'auto' as const, label: 'Auto', desc: 'orchestrator가 자동 설계', icon: Rocket },
  { id: 'template' as const, label: 'Template', desc: '파이프라인 선택', icon: FileText },
  { id: 'direct' as const, label: 'Direct', desc: '에이전트에 직접 명령', icon: MessageSquare },
]

export function LaunchForm() {
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
  }, [])

  useEffect(() => {
    textareaRef.current?.focus()
  }, [mode])

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
        const res = await api.chat.send({
          content: prompt,
          agent_type_id: agentTypeId,
          cwd,
          auto_spawn: true,
        })
        if (res.agentId) {
          wsClient.subscribe([`agent:${res.agentId}`])
        }
        navigate('/live')
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
    <div className="w-full max-w-2xl space-y-4">
      <div className="flex gap-1 rounded-lg border border-border p-1">
        {modes.map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-xs transition-colors',
              mode === m.id
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <m.icon size={14} strokeWidth={1.5} />
            <div className="text-left">
              <div className="font-medium">{m.label}</div>
              <div className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{m.desc}</div>
            </div>
          </button>
        ))}
      </div>

      <Textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="what to build?"
        className="max-h-60 resize-none bg-card dark:bg-card px-4 py-3 text-sm placeholder:text-muted-foreground/50 focus:border-primary/50"
      />

      <div className="flex gap-2">
        <DirectoryPicker
          value={cwd}
          onChange={setCwd}
          className="flex-1"
        />

        {mode === 'template' && (
          <Select value={template || ''} onValueChange={(v) => setTemplate(v || null)}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue placeholder="select pipeline..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.name} value={t.name} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {mode === 'direct' && (
          <Select value={agentTypeId} onValueChange={setAgentTypeId}>
            <SelectTrigger className="h-8 w-48 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {agentTypes.map((t) => (
                <SelectItem key={t.id} value={t.id} className="text-xs">
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <Button
        onClick={handleLaunch}
        disabled={!prompt.trim() || !cwd.trim() || launching || (mode === 'template' && !template)}
        className="w-full"
      >
        {launching ? <Loader2 className="animate-spin" size={16} /> : <Rocket size={16} />}
        {mode === 'auto' ? 'auto launch' : mode === 'template' ? 'run pipeline' : 'send to agent'}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        ⌘ Enter to launch
      </p>
    </div>
  )
}
