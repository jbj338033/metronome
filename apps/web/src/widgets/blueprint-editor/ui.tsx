import { useState } from 'react'
import { api } from '@/shared/api/client'
import { cn } from '@/shared/lib/cn'
import type { Blueprint } from '@metronome/types'

interface BlueprintEditorProps {
  blueprint: Blueprint
  onSave: () => void
}

export function BlueprintEditor({ blueprint, onSave }: BlueprintEditorProps) {
  const [form, setForm] = useState({ ...blueprint })
  const [saving, setSaving] = useState(false)

  function update<K extends keyof Blueprint>(key: K, value: Blueprint[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    await api.blueprints.save(form.name, form)
    setSaving(false)
    onSave()
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">name</label>
        <input
          value={form.name}
          disabled
          className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-400 outline-none"
        />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">agent</label>
          <input
            value={form.agent}
            onChange={(e) => update('agent', e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">model</label>
          <input
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">timeout (s)</label>
          <input
            type="number"
            value={form.timeout}
            onChange={(e) => update('timeout', Number(e.target.value))}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">max turns</label>
          <input
            type="number"
            value={form.max_turns || ''}
            onChange={(e) => update('max_turns', e.target.value ? Number(e.target.value) : undefined)}
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">system prompt</label>
        <textarea
          value={form.system}
          onChange={(e) => update('system', e.target.value)}
          rows={6}
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-[var(--font-mono)] text-xs text-zinc-300 outline-none"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-zinc-600">prompt template</label>
        <textarea
          value={form.prompt_template || ''}
          onChange={(e) => update('prompt_template', e.target.value)}
          rows={4}
          className="w-full resize-y rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1.5 font-[var(--font-mono)] text-xs text-zinc-300 outline-none"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-md bg-zinc-100 py-1.5 text-xs text-zinc-900 hover:bg-zinc-200 disabled:opacity-50"
      >
        {saving ? 'saving...' : 'save blueprint'}
      </button>
    </div>
  )
}
