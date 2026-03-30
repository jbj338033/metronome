import type { AgentAdapter } from './adapter'
import { claudeAdapter } from './adapters/claude'
import { codexAdapter } from './adapters/codex'
import { geminiAdapter } from './adapters/gemini'

const adapters = new Map<string, AgentAdapter>()

adapters.set(claudeAdapter.id, claudeAdapter)
adapters.set(codexAdapter.id, codexAdapter)
adapters.set(geminiAdapter.id, geminiAdapter)

export function getAdapter(id: string): AgentAdapter | undefined {
  return adapters.get(id)
}

export function listAdapters(): AgentAdapter[] {
  return [...adapters.values()]
}

export async function checkAllAvailability(): Promise<Record<string, boolean>> {
  const result: Record<string, boolean> = {}
  for (const [id, adapter] of adapters) {
    result[id] = await adapter.checkAvailable()
  }
  return result
}
