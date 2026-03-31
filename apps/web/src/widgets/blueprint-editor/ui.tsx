import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { api } from '@/shared/api/client'
import { Input } from '@/shared/ui/input'
import { Textarea } from '@/shared/ui/textarea'
import { Button } from '@/shared/ui/button'
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
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">name</label>
        <Input value={form.name} disabled className="h-8 text-xs" />
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">agent</label>
          <Input
            value={form.agent}
            onChange={(e) => update('agent', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">model</label>
          <Input
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">timeout (s)</label>
          <Input
            type="number"
            value={form.timeout}
            onChange={(e) => update('timeout', Number(e.target.value))}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">max turns</label>
          <Input
            type="number"
            value={form.max_turns || ''}
            onChange={(e) => update('max_turns', e.target.value ? Number(e.target.value) : undefined)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">system prompt</label>
        <Textarea
          value={form.system}
          onChange={(e) => update('system', e.target.value)}
          rows={6}
          className="resize-y font-mono text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground/60">prompt template</label>
        <Textarea
          value={form.prompt_template || ''}
          onChange={(e) => update('prompt_template', e.target.value)}
          rows={4}
          className="resize-y font-mono text-xs"
        />
      </div>
      <Button onClick={handleSave} disabled={saving} className="w-full">
        {saving ? <><Loader2 className="animate-spin" /> saving...</> : 'save blueprint'}
      </Button>
    </div>
  )
}
