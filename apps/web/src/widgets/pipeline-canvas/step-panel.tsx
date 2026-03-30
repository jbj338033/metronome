import type { PipelineStep } from '@metronome/types'

interface StepPanelProps {
  step: PipelineStep
}

function Field({ label, value }: { label: string; value: string | number | boolean | undefined | null }) {
  if (value == null || value === '') return null
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-zinc-500">{label}</span>
      <span className="font-[var(--font-mono)] text-xs text-zinc-300">{String(value)}</span>
    </div>
  )
}

export function StepPanel({ step }: StepPanelProps) {
  return (
    <div className="border-t border-zinc-800 p-4">
      <div className="mb-3 text-xs font-medium text-zinc-400">
        step: <span className="text-zinc-200">{step.id}</span>
      </div>
      <div className="space-y-1.5">
        <Field label="blueprint" value={step.blueprint} />
        <Field label="depends_on" value={step.depends_on?.join(', ')} />
        <Field label="fan_out" value={step.fan_out} />
        <Field label="merge" value={step.merge} />
        <Field label="max_concurrency" value={step.max_concurrency} />
        <Field label="merge_strategy" value={step.merge_strategy} />
        <Field label="on_conflict" value={step.on_conflict} />
        <Field label="timeout" value={step.timeout ? `${step.timeout}s` : undefined} />
        <Field label="retry" value={step.retry ? `max ${step.retry.max}` : undefined} />
        <Field label="condition" value={step.condition} />
        <Field label="on_skip" value={step.on_skip} />
        <Field label="approval" value={step.approval} />
      </div>
    </div>
  )
}
