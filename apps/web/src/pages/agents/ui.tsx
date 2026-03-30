import { useState, useEffect } from 'react'
import { api } from '@/shared/api/client'
import { useAppStore } from '@/shared/stores/app'
import { cn } from '@/shared/lib/cn'

export function AgentsPage() {
  const [types, setTypes] = useState<Array<{ id: string; name: string; command: string }>>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const agents = useAppStore((s) => s.agents)
  const running = useAppStore((s) => s.runningAgents)

  useEffect(() => {
    api.agents.types().then(setTypes)
    api.agents.availability().then(setAvailability)
  }, [])

  const recent = agents.slice(0, 20)

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-zinc-800 px-6 py-3">
        <h1 className="text-sm font-semibold">Agents</h1>
      </div>

      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* Agent Types */}
        <div>
          <h2 className="mb-3 text-xs font-medium text-zinc-500">available agent types</h2>
          <div className="space-y-1">
            {types.map((t) => (
              <div key={t.id} className="flex items-center gap-3 rounded-md border border-zinc-800 px-3 py-2">
                <span className={cn(
                  'h-2 w-2 rounded-full',
                  availability[t.id] ? 'bg-emerald-400' : 'bg-red-400',
                )} />
                <span className="text-sm text-zinc-200">{t.name}</span>
                <span className="font-[var(--font-mono)] text-xs text-zinc-600">{t.command}</span>
                <span className="ml-auto text-xs text-zinc-600">
                  {availability[t.id] ? 'installed' : 'not found'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Running */}
        {running.length > 0 && (
          <div>
            <h2 className="mb-3 text-xs font-medium text-zinc-500">running ({running.length})</h2>
            <div className="space-y-1">
              {running.map((r) => (
                <div key={r.agentId} className="flex items-center gap-3 rounded-md border border-emerald-900/50 bg-emerald-950/10 px-3 py-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-[var(--font-mono)] text-xs text-zinc-300">{r.agentId.slice(0, 8)}</span>
                  <span className="text-xs text-zinc-500">{r.adapterId}</span>
                  <span className="ml-auto font-[var(--font-mono)] text-xs text-zinc-600">pid {r.pid}</span>
                  <button
                    onClick={() => api.agents.kill(r.agentId)}
                    className="rounded px-2 py-0.5 text-xs text-red-400 hover:bg-red-950/30"
                  >
                    kill
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent History */}
        <div>
          <h2 className="mb-3 text-xs font-medium text-zinc-500">recent agents</h2>
          {recent.length === 0 ? (
            <p className="text-xs text-zinc-600">아직 실행 기록이 없어요</p>
          ) : (
            <div className="space-y-1">
              {recent.map((a: any) => (
                <div key={a.id} className="flex items-center gap-3 border-b border-zinc-900 px-1 py-1.5 text-xs">
                  <span className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    a.status === 'completed' ? 'bg-zinc-500' : a.status === 'failed' ? 'bg-red-400' : a.status === 'killed' ? 'bg-yellow-400' : 'bg-zinc-700',
                  )} />
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
    </div>
  )
}
