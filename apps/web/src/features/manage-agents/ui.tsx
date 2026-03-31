import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { api } from '@/shared/api/client'
import { useAgentStore } from '@/entities/agent/model/store'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Button } from '@/shared/ui/button'
import { ModelBadge } from '@/shared/ui/model-badge'
import { SectionHeader } from '@/shared/ui/section-header'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import type { Agent } from '@metronome/types'

export function ManageAgents() {
  const [types, setTypes] = useState<Array<{ id: string; name: string; command: string }>>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const agents = useAgentStore((s) => s.agents)
  const running = useAgentStore((s) => s.runningAgents)

  useEffect(() => {
    api.agents.types().then(setTypes).catch(() => toast.error('failed to load agent types'))
    api.agents.availability().then(setAvailability).catch(() => toast.error('failed to check availability'))
  }, [])

  async function handleKill(agentId: string) {
    try {
      await api.agents.kill(agentId)
      toast.success('agent killed')
    } catch {
      toast.error('failed to kill agent')
    }
  }

  return (
    <div className="flex-1 overflow-auto">
      <SectionHeader>agent types</SectionHeader>
      <div className="p-4 space-y-1.5">
        {types.map((t) => (
          <div key={t.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-4 py-2.5">
            <span className={cn('h-2 w-2 rounded-full', availability[t.id] ? 'bg-emerald-400' : 'bg-red-400')} />
            <span className="text-sm text-foreground">{t.name}</span>
            <span className="font-mono text-xs text-muted-foreground">{t.command}</span>
            <span className="ml-auto text-xs text-muted-foreground">{availability[t.id] ? 'installed' : 'not found'}</span>
          </div>
        ))}
      </div>

      {running.length > 0 && (
        <>
          <SectionHeader count={running.length} indicator="active">running</SectionHeader>
          <div className="p-4 space-y-1.5">
            {running.map((r) => (
              <div key={r.agentId} className="flex items-center gap-3 rounded-lg border border-emerald-900/50 bg-emerald-950/10 px-4 py-2.5">
                <StatusIcon status="in_progress" className="size-3.5" />
                <span className="font-mono text-xs text-foreground/80">{r.agentId.slice(0, 8)}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">pid {r.pid}</span>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="xs">kill</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>kill agent?</AlertDialogTitle>
                      <AlertDialogDescription>the agent process will be terminated immediately</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleKill(r.agentId)}>kill</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        </>
      )}

      <SectionHeader count={Math.min(agents.length, 20)}>recent</SectionHeader>
      <div className="p-4">
        <div className="rounded-lg bg-surface-1 overflow-hidden">
          {agents.slice(0, 20).map((a: Agent) => (
            <div key={a.id} className="flex items-center gap-3 border-b border-border last:border-b-0 px-4 py-2.5 text-xs">
              <StatusIcon status={a.status} className="size-3" />
              <span className="font-mono text-muted-foreground">{a.id.slice(0, 8)}</span>
              <span className="text-foreground/70">{a.blueprint || a.type_id}</span>
              {a.model && <ModelBadge model={a.model} />}
              <span className="ml-auto font-mono tabular-nums text-muted-foreground">
                {a.tokens_in + a.tokens_out > 0
                  ? `${((a.tokens_in + a.tokens_out) / 1000).toFixed(1)}k`
                  : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
