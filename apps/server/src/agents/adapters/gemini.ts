import { execFile } from 'child_process'
import type { AgentAdapter, AgentSpawnOptions, AgentStreamEvent } from '../adapter'

export const geminiAdapter: AgentAdapter = {
  id: 'gemini',
  name: 'Gemini',

  async checkAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('which', ['gemini'], { timeout: 5000 }, (err) => {
        resolve(!err)
      })
    })
  },

  buildCommand(opts: AgentSpawnOptions) {
    const args = ['-p', opts.prompt]
    return { cmd: 'gemini', args }
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
