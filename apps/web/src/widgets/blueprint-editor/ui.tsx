import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
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
    try {
      await api.blueprints.save(form.name, form)
      toast.success('blueprint saved')
      onSave()
    } catch {
      toast.error('failed to save blueprint')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">name</label>
        <Input value={form.name} disabled className="h-8 text-xs" />
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">agent</label>
          <Input
            value={form.agent}
            onChange={(e) => update('agent', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">model</label>
          <Input
            value={form.model}
            onChange={(e) => update('model', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">timeout (s)</label>
          <Input
            type="number"
            value={form.timeout}
            onChange={(e) => update('timeout', Number(e.target.value))}
            min={1}
            className="h-8 text-xs"
          />
        </div>
        <div className="flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">max turns</label>
          <Input
            type="number"
            value={form.max_turns || ''}
            onChange={(e) => update('max_turns', e.target.value ? Number(e.target.value) : undefined)}
            min={1}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">system prompt</label>
        <Textarea
          value={form.system}
          onChange={(e) => update('system', e.target.value)}
          rows={6}
          className="resize-y font-mono text-xs"
        />
      </div>
      <div>
        <label className="mb-1 block text-xs text-muted-foreground">prompt template</label>
        <Textarea
          value={form.prompt_template || ''}
          onChange={(e) => update('prompt_template', e.target.value)}
          rows={4}
          className="resize-y font-mono text-xs"
        />
      </div>
      <Button onClick={handleSave} disabled={saving} size="sm">
        {saving ? <><Loader2 className="animate-spin" size={14} /> saving...</> : 'save'}
      </Button>
    </div>
  )
}
