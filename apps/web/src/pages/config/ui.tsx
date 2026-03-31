import { useState, useEffect } from 'react'
import { api } from '@/shared/api/client'
import { useAgentStore } from '@/entities/agent/model/store'
import { BlueprintEditor } from '@/widgets/blueprint-editor/ui'
import { PipelineCanvas } from '@/widgets/pipeline-canvas/ui'
import { StepPanel } from '@/widgets/pipeline-canvas/step-panel'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Button } from '@/shared/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import type { Blueprint, Pipeline, PipelineStep } from '@metronome/types'

export function ConfigPage() {
  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="blueprints" className="flex h-full flex-col">
        <div className="flex items-center gap-4 border-b border-border px-6 py-3">
          <h1 className="text-sm font-semibold">Config</h1>
          <TabsList className="ml-auto h-7">
            <TabsTrigger value="blueprints" className="text-xs px-2.5 h-6">blueprints</TabsTrigger>
            <TabsTrigger value="templates" className="text-xs px-2.5 h-6">templates</TabsTrigger>
            <TabsTrigger value="agents" className="text-xs px-2.5 h-6">agents</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="blueprints" className="flex-1 overflow-hidden mt-0">
          <BlueprintsTab />
        </TabsContent>
        <TabsContent value="templates" className="flex-1 overflow-hidden mt-0">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="agents" className="flex-1 overflow-auto mt-0">
          <AgentsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function BlueprintsTab() {
  const [blueprints, setBlueprints] = useState<Blueprint[]>([])
  const [selected, setSelected] = useState<Blueprint | null>(null)

  useEffect(() => {
    api.blueprints.list().then(setBlueprints)
  }, [])

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="w-56 shrink-0 overflow-auto border-r border-border p-3 space-y-1">
        {blueprints.map((bp) => (
          <button
            key={bp.name}
            onClick={() => setSelected(bp)}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              selected?.name === bp.name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
            )}
          >
            <span>{bp.name}</span>
            <span className="text-muted-foreground/60">{bp.agent}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-6">
        {selected ? (
          <BlueprintEditor blueprint={selected} onSave={() => api.blueprints.list().then(setBlueprints)} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            블루프린트를 선택해주세요
          </div>
        )}
      </div>
    </div>
  )
}

function TemplatesTab() {
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
      <div className="w-56 shrink-0 overflow-auto border-r border-border p-3 space-y-1">
        {pipelines.map((p) => (
          <button
            key={p.name}
            onClick={() => { setSelected(p.name); setSelectedStep(null) }}
            className={cn(
              'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              selected === p.name ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-accent/50',
            )}
          >
            <span>{p.name}</span>
            <span className="text-muted-foreground/60">{p.source}</span>
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
          <div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
            파이프라인을 선택해주세요
          </div>
        )}
      </div>
    </div>
  )
}

function AgentsTab() {
  const [types, setTypes] = useState<Array<{ id: string; name: string; command: string }>>([])
  const [availability, setAvailability] = useState<Record<string, boolean>>({})
  const agents = useAgentStore((s) => s.agents)
  const running = useAgentStore((s) => s.runningAgents)

  useEffect(() => {
    api.agents.types().then(setTypes)
    api.agents.availability().then(setAvailability)
  }, [])

  return (
    <div className="flex-1 overflow-auto p-6 space-y-6">
      <div>
        <h2 className="mb-3 text-xs font-medium text-muted-foreground">agent types</h2>
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
                <span className="ml-auto font-mono text-xs text-muted-foreground">pid {r.pid}</span>
                <Button onClick={() => api.agents.kill(r.agentId)} variant="destructive" size="xs">kill</Button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-xs font-medium text-muted-foreground">recent ({agents.slice(0, 20).length})</h2>
        <div className="space-y-1">
          {agents.slice(0, 20).map((a: any) => (
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
              <span className="ml-auto font-mono text-muted-foreground">
                {a.tokens_in + a.tokens_out > 0 ? `${((a.tokens_in + a.tokens_out) / 1000).toFixed(1)}k` : ''}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
