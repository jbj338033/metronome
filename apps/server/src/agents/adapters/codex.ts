import { execFile } from 'child_process'
import type { AgentAdapter, AgentSpawnOptions, AgentStreamEvent } from '../adapter'

export const codexAdapter: AgentAdapter = {
  id: 'codex',
  name: 'Codex',

  async checkAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('which', ['codex'], { timeout: 5000 }, (err) => {
        resolve(!err)
      })
    })
  },

  buildCommand(opts: AgentSpawnOptions) {
    const args = ['exec', '-q', '--approval-mode', 'full-auto']

    if (opts.model) {
      args.push('--model', opts.model)
    }

    args.push(opts.prompt)

    return { cmd: 'codex', args }
  },

  parseOutput(chunk: string): AgentStreamEvent[] {
    const events: AgentStreamEvent[] = []
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (!line.trim()) continue
      events.push({ type: 'text', content: line, timestamp: Date.now() })
    }

    return events
  },
}
