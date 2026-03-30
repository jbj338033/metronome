import { useState, useEffect } from 'react'
import { api } from '@/shared/api/client'
import { PipelineCanvas } from '@/widgets/pipeline-canvas/ui'
import { StepPanel } from '@/widgets/pipeline-canvas/step-panel'
import { cn } from '@/shared/lib/cn'
import type { Pipeline, PipelineStep } from '@metronome/types'

export function PipelineEditorPage() {
  const [pipelines, setPipelines] = useState<Array<Pipeline & { source: string }>>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [pipeline, setPipeline] = useState<Pipeline | null>(null)
  const [selectedStep, setSelectedStep] = useState<PipelineStep | null>(null)
  const [runPrompt, setRunPrompt] = useState('')
  const [runCwd, setRunCwd] = useState('')

  useEffect(() => {
    api.tasks.list().catch(() => {}) // warm up
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
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-3">
        <h1 className="text-sm font-semibold">Pipelines</h1>
        <div className="ml-auto flex items-center gap-2">
          <select
            value={selected || ''}
            onChange={(e) => { setSelected(e.target.value || null); setSelectedStep(null) }}
            className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 outline-none"
          >
            <option value="">select pipeline...</option>
            {pipelines.map((p) => (
              <option key={p.name} value={p.name}>{p.name} ({p.source})</option>
            ))}
          </select>
        </div>
      </div>

      {!pipeline ? (
        <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
          파이프라인을 선택해주세요
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="flex-1">
            <PipelineCanvas
              pipeline={pipeline}
              onSelectNode={(id) => {
                setSelectedStep(id ? pipeline.steps.find((s) => s.id === id) || null : null)
              }}
            />
          </div>

          {/* Right panel */}
          <div className="w-64 shrink-0 flex-col border-l border-zinc-800 overflow-auto">
            {/* Run controls */}
            <div className="border-b border-zinc-800 p-4 space-y-2">
              <input
                value={runPrompt}
                onChange={(e) => setRunPrompt(e.target.value)}
                placeholder="prompt..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
              />
              <input
                value={runCwd}
                onChange={(e) => setRunCwd(e.target.value)}
                placeholder="working directory..."
                className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
              />
              <button
                onClick={handleRun}
                disabled={!runPrompt.trim() || !runCwd.trim()}
                className={cn(
                  'w-full rounded-md py-1.5 text-xs transition-colors',
                  runPrompt.trim() && runCwd.trim()
                    ? 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200'
                    : 'bg-zinc-800 text-zinc-600',
                )}
              >
                run pipeline
              </button>
            </div>

            {/* Pipeline info */}
            <div className="border-b border-zinc-800 p-4 space-y-1">
              <div className="text-xs text-zinc-500">name: <span className="text-zinc-300">{pipeline.name}</span></div>
              <div className="text-xs text-zinc-500">steps: <span className="text-zinc-300">{pipeline.steps.length}</span></div>
              {pipeline.timeout && <div className="text-xs text-zinc-500">timeout: <span className="text-zinc-300">{pipeline.timeout}s</span></div>}
              {pipeline.max_replan && <div className="text-xs text-zinc-500">max_replan: <span className="text-zinc-300">{pipeline.max_replan}</span></div>}
            </div>

            {/* Selected step */}
            {selectedStep && <StepPanel step={selectedStep} />}
          </div>
        </div>
      )}
    </div>
  )
}
