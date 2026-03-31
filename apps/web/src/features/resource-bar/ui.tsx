import { useAgentStore } from '@/entities/agent/model/store'
import { cn } from '@/shared/lib/cn'
import { ModelBadge } from '@/shared/ui/model-badge'

export interface ModelStat {
  model: string
  count: number
  tokens_in: number
  tokens_out: number
  estimated_cost: number
}

export function ResourceBar({ stats }: { stats: ModelStat[] }) {
  const runningAgents = useAgentStore((s) => s.runningAgents)
  const totalCost = stats.reduce((s, r) => s + r.estimated_cost, 0)
  const totalTokens = stats.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0)

  return (
    <div className="flex items-center gap-5 border-b border-border bg-surface-1 px-6 py-3 text-xs">
      <div className="flex items-center gap-1.5">
        <span className={cn(
          'size-2 rounded-full',
          runningAgents.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30',
        )} />
        <span className={cn(
          'font-medium',
          runningAgents.length > 0 ? 'text-emerald-400' : 'text-muted-foreground',
        )}>
          {runningAgents.length} agent{runningAgents.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-4 w-px bg-border" />
      {stats.map((s) => (
        <span key={s.model} className="flex items-center gap-1.5 text-muted-foreground">
          <ModelBadge model={s.model || '?'} />
          <span className="font-mono">{((s.tokens_in + s.tokens_out) / 1000).toFixed(0)}k</span>
        </span>
      ))}
      <div className="ml-auto flex items-center gap-3 text-muted-foreground">
        {totalTokens > 0 && <span className="font-mono">{(totalTokens / 1000).toFixed(0)}k tokens</span>}
        {totalCost > 0 && <span className="font-mono text-foreground/60">${totalCost.toFixed(3)}</span>}
      </div>
    </div>
  )
}
