import { useState, useEffect } from 'react'
import { api } from '@/shared/api/client'
import { useAppStore } from '@/shared/stores/app'
import { BlueprintEditor } from '@/widgets/blueprint-editor/ui'
import { cn } from '@/shared/lib/cn'
import type { Blueprint } from '@metronome/types'

type Tab = 'agents' | 'blueprints'

export function AgentsPage() {
  const [tab, setTab] = useState<Tab>('agents')
  const [types, setTypes] = useState<Array<{ id: string; name: string; command: string }>>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [selectedBp, setSelectedBp] = useState<Blueprint | null>(null)
  const agents = useAppStore((s) => s.agents)
  const running = useAppStore((s) => s.runningAgents)

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
      <div className="flex items-center gap-4 border-b border-zinc-800 px-6 py-3">
        <h1 className="text-sm font-semibold">Agents</h1>
        <div className="ml-auto flex gap-1">
          {(['agents', 'blueprints'] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); setSelectedBp(null) }}
              className={cn(
                'rounded-md px-3 py-1 text-xs transition-colors',
                tab === t ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === 'agents' ? (
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <div>
            <h2 className="mb-3 text-xs font-medium text-zinc-500">available agent types</h2>
            <div className="space-y-1">
              {types.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2">
                  <span className={cn('h-2 w-2 rounded-full', availability[t.id] ? 'bg-emerald-400' : 'bg-red-400')} />
                  <span className="text-sm text-zinc-200">{t.name}</span>
                  <span className="font-[var(--font-mono)] text-xs text-zinc-600">{t.command}</span>
                  <span className="ml-auto text-xs text-zinc-600">{availability[t.id] ? 'installed' : 'not found'}</span>
                </div>
              ))}
            </div>
          </div>

          {running.length > 0 && (
            <div>
              <h2 className="mb-3 text-xs font-medium text-zinc-500">running ({running.length})</h2>
              <div className="space-y-1">
                {running.map((r) => (
                  <div key={r.agentId} className="flex items-center gap-3 rounded-md border border-emerald-900/50 bg-emerald-950/10 px-3 py-2">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                    <span className="font-[var(--font-mono)] text-xs text-zinc-300">{r.agentId.slice(0, 8)}</span>
                    <span className="text-xs text-zinc-500">{r.adapterId}</span>
                    <span className="ml-auto font-[var(--font-mono)] text-xs text-zinc-600">pid {r.pid}</span>
                    <button onClick={() => api.agents.kill(r.agentId)} className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-950/30">kill</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="mb-3 text-xs font-medium text-zinc-500">recent agents</h2>
            {recent.length === 0 ? (
              <p className="text-xs text-zinc-600">아직 실행 기록이 없어요</p>
            ) : (
              <div className="space-y-1">
                {recent.map((a: any) => (
                  <div key={a.id} className="flex items-center gap-3 border-b border-zinc-900 px-1 py-1.5 text-xs">
                    <span className={cn('h-1.5 w-1.5 rounded-full', a.status === 'completed' ? 'bg-zinc-500' : a.status === 'failed' ? 'bg-red-400' : a.status === 'killed' ? 'bg-yellow-400' : 'bg-zinc-700')} />
                    <span className="font-[var(--font-mono)] text-zinc-500">{a.id.slice(0, 8)}</span>
                    <span className="text-zinc-400">{a.blueprint || a.type_id}</span>
                    <span className="text-zinc-600">{a.status}</span>
                    <span className="ml-auto font-[var(--font-mono)] text-zinc-600">
                      {a.tokens_in + a.tokens_out > 0 ? `${((a.tokens_in + a.tokens_out) / 1000).toFixed(1)}k` : ''}
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
          <div className="w-56 shrink-0 overflow-auto border-r border-zinc-800 p-3">
            <div className="space-y-1">
              {blueprints.map((bp) => (
                <button
                  key={bp.name}
                  onClick={() => setSelectedBp(bp)}
                  className={cn(
                    'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                    selectedBp?.name === bp.name ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-400 hover:bg-zinc-900',
                  )}
                >
                  <span>{bp.name}</span>
                  <span className="text-zinc-600">{bp.model}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Blueprint editor */}
          <div className="flex-1 overflow-auto p-6">
            {selectedBp ? (
              <BlueprintEditor blueprint={selectedBp} onSave={handleBpSaved} />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-zinc-600">
                블루프린트를 선택해주세요
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
