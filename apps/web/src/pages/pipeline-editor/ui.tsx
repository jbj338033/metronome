import { useState, useEffect } from 'react'
import { Workflow } from 'lucide-react'
import { api } from '@/shared/api/client'
import { PipelineCanvas } from '@/widgets/pipeline-canvas/ui'
import { StepPanel } from '@/widgets/pipeline-canvas/step-panel'
import { Input } from '@/shared/ui/input'
import { Button } from '@/shared/ui/button'
import type { Pipeline, PipelineStep } from '@metronome/types'

export function PipelineEditorPage() {
  const [pipelines, setPipelines] = useState<Array<Pipeline & { source: string }>>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null)
  const [runPrompt, setRunPrompt] = useState('')
  const [runCwd, setRunCwd] = useState('')

  useEffect(() => {
    api.tasks.list().catch(() => {})
    fetch('/api/pipelines').then((r) => r.json()).then(setPipelines)
  }, [])

  useEffect(() => {
    if (!selected) { setPipeline(null); return }
    fetch(`/api/pipelines/${selected}`).then((r) => r.json()).then(setPipeline)
  }, [selected])

  async function handleRun() {
    if (!selected || !runPrompt.trim() || !runCwd.trim()) return
    const res = await fetch(`/api/pipelines/${selected}/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: runPrompt, cwd: runCwd }),
    })
    if (res.ok) {
      const { runId } = await res.json()
      window.location.href = `/pipelines/runs/${runId}`
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Pipelines</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={selected || ''}
            onChange={(e) => { setSelected(e.target.value || null); setSelectedStep(null) }}
            className="h-8 rounded-md border border-input bg-secondary px-2 text-xs text-secondary-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">select pipeline...</option>
            {pipelines.map((p) => (
              <option key={p.name} value={p.name}>{p.name} ({p.source})</option>
            ))}
          </select>
        </div>
      </div>

      {!pipeline ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <Workflow size={32} strokeWidth={1} className="text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">파이프라인을 선택해주세요</p>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1">
            <PipelineCanvas
              pipeline={pipeline}
              onSelectNode={(id) => {
                setSelectedStep(id ? pipeline.steps.find((s) => s.id === id) || null : null)
              }}
            />
          </div>

          <div className="w-64 shrink-0 flex-col border-l border-border overflow-auto">
            <div className="border-b border-border p-4 space-y-2">
              <Input
                value={runPrompt}
                onChange={(e) => setRunPrompt(e.target.value)}
                placeholder="prompt..."
                className="h-7 text-xs"
              />
              <Input
                value={runCwd}
                onChange={(e) => setRunCwd(e.target.value)}
                placeholder="working directory..."
                className="h-7 text-xs"
              />
              <Button
                onClick={handleRun}
                disabled={!runPrompt.trim() || !runCwd.trim()}
                className="w-full"
                size="sm"
              >
                run pipeline
              </Button>
            </div>

            <div className="border-b border-border p-4 space-y-1">
              <div className="text-xs text-muted-foreground">name: <span className="text-foreground/80">{pipeline.name}</span></div>
              <div className="text-xs text-muted-foreground">steps: <span className="text-foreground/80">{pipeline.steps.length}</span></div>
              {pipeline.timeout && <div className="text-xs text-muted-foreground">timeout: <span className="text-foreground/80">{pipeline.timeout}s</span></div>}
              {pipeline.max_replan && <div className="text-xs text-muted-foreground">max_replan: <span className="text-foreground/80">{pipeline.max_replan}</span></div>}
            </div>

            {selectedStep && <StepPanel step={selectedStep} />}
          </div>
        </div>
      )}
    </div>
  )
}
