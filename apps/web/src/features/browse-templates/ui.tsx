import { useState, useEffect } from 'react'
import { api } from '@/shared/api/client'
import { PipelineCanvas } from '@/widgets/pipeline-canvas/ui'
import { StepPanel } from '@/widgets/pipeline-canvas/step-panel'
import { cn } from '@/shared/lib/cn'
import type { Pipeline, PipelineStep } from '@metronome/types'

export function BrowseTemplates() {
  const [pipelines, setPipelines] = useState<Array<Pipeline & { source: string }>>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null)

  useEffect(() => {
    api.pipelines.list().then(setPipelines)
  }, [])

  useEffect(() => {
    if (!selected) { setPipeline(null); return }
    api.pipelines.get(selected).then(setPipeline)
  }, [selected])

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-60 shrink-0 overflow-auto border-r border-border bg-surface-1 p-3 space-y-0.5">
        {pipelines.map((p) => (
          <button
            key={p.name}
            onClick={() => { setSelected(p.name); setSelectedStep(null) }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors',
              selected === p.name
                ? 'bg-accent text-accent-foreground'
                : 'text-muted-foreground hover:bg-accent/50',
            )}
          >
            <span>{p.name}</span>
            <span className="text-xs text-muted-foreground/60">{p.source}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden">
        {pipeline ? (
          <>
            <div className="flex-1">
              <PipelineCanvas
                pipeline={pipeline}
                onSelectNode={(id) => setSelectedStep(id ? pipeline.steps.find((s) => s.id === id) || null : null)}
              />
            </div>
            {selectedStep && (
              <div className="w-64 shrink-0 border-l border-border overflow-auto">
                <StepPanel step={selectedStep} />
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-[13px] text-muted-foreground">
            select a pipeline
          </div>
        )}
      </div>
    </div>
  )
}
