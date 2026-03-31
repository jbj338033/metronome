import { useState, useEffect } from 'react'
import { Bot, RotateCw } from 'lucide-react'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { useAgentStore } from '@/entities/agent/model/store'
import { BlueprintEditor } from '@/widgets/blueprint-editor/ui'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Button } from '@/shared/ui/button'
import type { Blueprint } from '@metronome/types'

type Tab = 'agents' | 'blueprints'

export function AgentsPage() {
  const [tab, setTab] = useState<Tab>('agents')
  const [types, setTypes] = useState<Array<{ id: string; name: string; command: string }>>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [selectedBp, setSelectedBp] = useState<Blueprint | null>(null)
  const agents = useAgentStore((s) => s.agents)
  const running = useAgentStore((s) => s.runningAgents)

  useEffect(() => {
    api.agents.types().then(setTypes)
    api.agents.availability().then(setAvailability)
  }, [])

  useEffect(() => {
    if (tab === 'blueprints') {
      api.blueprints.list().then(setBlueprints)
    }
  }, [tab])

  function handleBpSaved() {
    api.blueprints.list().then(setBlueprints)
  }

  const recent = agents.slice(0, 20)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-4 border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Agents</h1>
        <div className="ml-auto flex gap-1">
          {(['agents', 'blueprints'] as const).map((t) => (
            <Button
              key={t}
              onClick={() => { setTab(t); setSelectedBp(null) }}
              variant={tab === t ? 'secondary' : 'ghost'}
              size="sm"
              className="text-xs"
            >
              {t}
            </Button>
          ))}
        </div>
      </div>

      {tab === 'agents' ? (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h2 className="mb-3 text-xs font-medium text-muted-foreground">available agent types</h2>
            <div className="space-y-1">
              {types.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-md border border-border px-3 py-2">
                  <span className={cn('h-2 w-2 rounded-full', availability[t.id] ? 'bg-emerald-400' : 'bg-red-400')} />
                  <span className="text-sm text-foreground">{t.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{t.command}</span>
                  <span className="ml-auto text-xs text-muted-foreground">{availability[t.id] ? 'installed' : 'not found'}</span>
                </div>
              ))}
            </div>
          </div>

          {running.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium text-muted-foreground">running ({running.length})</h2>
              <div className="space-y-1">
                {running.map((r) => (
                  <div key={r.agentId} className="flex items-center gap-3 rounded-md border border-emerald-900/50 bg-emerald-950/10 px-3 py-2">
                    <StatusIcon status="in_progress" className="size-3.5" />
                    <span className="font-mono text-xs text-foreground/80">{r.agentId.slice(0, 8)}</span>
                    <span className="text-xs text-muted-foreground">{r.adapterId}</span>
                    <span className="ml-auto font-mono text-xs text-muted-foreground">pid {r.pid}</span>
                    <Button onClick={() => api.agents.kill(r.agentId)} variant="destructive" size="xs">kill</Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-xs font-medium text-muted-foreground">recent agents</h2>
            {recent.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Bot size={24} strokeWidth={1} className="text-muted-foreground/40" />
                <p className="text-xs text-muted-foreground">아직 실행 기록이 없어요</p>
              </div>
            ) : (
              <div className="space-y-1">
                {recent.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 border-b border-border px-1 py-1.5 text-xs">
                    <StatusIcon status={a.status} className="size-3" />
                    <span className="font-mono text-muted-foreground">{a.id.slice(0, 8)}</span>
                    <span className="text-foreground/70">{a.blueprint || a.type_id}</span>
                    {a.model && (
                      <span className={cn(
                        'rounded px-1 py-0.5 text-[10px] font-mono',
                        a.model === 'opus' ? 'bg-violet-500/20 text-violet-400'
                          : a.model === 'haiku' ? 'bg-zinc-500/20 text-zinc-400'
                          : 'bg-blue-500/20 text-blue-400',
                      )}>
                        {a.model}
                      </span>
                    )}
                    <span className="text-muted-foreground">{a.status}</span>
                    <span className="ml-auto flex items-center gap-2 font-mono text-muted-foreground">
                      {a.tokens_in + a.tokens_out > 0 ? `${((a.tokens_in + a.tokens_out) / 1000).toFixed(1)}k` : ''}
                      {a.session_id && a.status === 'completed' && (
                        <Button
                          onClick={async () => {
                            const prompt = window.prompt('resume prompt:')
                            if (!prompt) return
                            const { agentId } = await api.agents.resume(a.id, prompt)
                            wsClient.subscribe([`agent:${agentId}`])
                          }}
                          variant="ghost"
                          size="xs"
                          className="h-5 px-1 text-muted-foreground hover:text-foreground"
                        >
                          <RotateCw size={12} />
                        </Button>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Blueprint list */}
          <div className="w-56 shrink-0 overflow-auto border-r border-border p-3">
            <div className="space-y-1">
              {blueprints.map((bp) => (
                <button
                  key={bp.name}
                  onClick={() => setSelectedBp(bp)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    selectedBp?.name === bp.name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
                  )}
                >
                  <span>{bp.name}</span>
                  <span className="text-muted-foreground/60">{bp.model}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Blueprint editor */}
          <div className="flex-1 overflow-auto p-6">
            {selectedBp ? (
              <BlueprintEditor blueprint={selectedBp} onSave={handleBpSaved} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                블루프린트를 선택해주세요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
