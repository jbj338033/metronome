import { useState, useEffect } from 'react'
import { api } from '@/shared/api/client'
import { BlueprintEditor } from '@/widgets/blueprint-editor/ui'
import { cn } from '@/shared/lib/cn'
import type { Blueprint } from '@metronome/types'

export function ManageBlueprints() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [selected, setSelected] = useState<Blueprint | null>(null)

  useEffect(() => {
    api.blueprints.list().then(setBlueprints)
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-60 shrink-0 overflow-auto border-r border-border bg-surface-1 p-3 space-y-0.5">
        {blueprints.map((bp) => (
          <button
            key={bp.name}
            onClick={() => setSelected(bp)}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors',
              selected?.name === bp.name
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50',
            )}
          >
            <span>{bp.name}</span>
            <span className="text-xs text-muted-foreground/60">{bp.agent}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <BlueprintEditor blueprint={selected} onSave={() => api.blueprints.list().then(setBlueprints)} />
        ) : (
          <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
            select a blueprint
          </div>
        )}
      </div>
    </div>
  )
}
