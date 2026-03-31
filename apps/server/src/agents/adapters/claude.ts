import { execFile } from 'child_process'
import type { AgentAdapter, AgentSpawnOptions, AgentStreamEvent } from '../adapter'

export const claudeAdapter: AgentAdapter = {
  id: 'claude-code',
  name: 'Claude Code',

  async checkAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      execFile('which', ['claude'], { timeout: 5000 }, (err) => {
        resolve(!err)
      })
    })
  },

  buildCommand(opts: AgentSpawnOptions) {
    const args = [
      '--print',
      '--output-format', 'stream-json',
      '--verbose',
      '--dangerously-skip-permissions',
    ]

    if (opts.resume && opts.sessionId) {
      args.push('--resume', opts.sessionId)
    } else if (opts.sessionId) {
      args.push('--session-id', opts.sessionId)
    }

    if (opts.model) {
      args.push('--model', opts.model)
    }

    if (opts.systemPrompt) {
      args.push('--system-prompt', opts.systemPrompt)
    }

    args.push(opts.prompt)

    return { cmd: 'claude', args }
  },

  parseOutput(chunk: string): AgentStreamEvent[] {
    const events: AgentStreamEvent[] = []
    const lines = chunk.split('\n').filter(Boolean)

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line)
        const ts = Date.now()

        if (parsed.type === 'assistant' && parsed.message?.content) {
          for (const block of parsed.message.content) {
            if (block.type === 'text') {
              events.push({ type: 'text', content: block.text, timestamp: ts })
            } else if (block.type === 'tool_use') {
              events.push({
                type: 'tool_use',
                content: block.name,
                metadata: { id: block.id, input: block.input },
                timestamp: ts,
              })
            }
          }
        } else if (parsed.type === 'result') {
          events.push({
            type: 'done',
            content: parsed.result || '',
            metadata: {
              cost: parsed.cost_usd,
              duration: parsed.duration_ms,
              tokens_in: parsed.usage?.input_tokens,
              tokens_out: parsed.usage?.output_tokens,
              session_id: parsed.session_id,
            },
            timestamp: ts,
          })
        } else if (parsed.type === 'tool_result') {
          events.push({
            type: 'tool_result',
            content: typeof parsed.content === 'string' ? parsed.content : JSON.stringify(parsed.content),
            metadata: { tool_use_id: parsed.tool_use_id },
            timestamp: ts,
          })
        }
      } catch {
        if (line.trim()) {
          events.push({ type: 'text', content: line, timestamp: Date.now() })
        }
      }
    }

    return events
  },

  extractSessionId(output: string): string | null {
    try {
      const lines = output.split('\n').filter(Boolean)
      for (const line of lines) {
        const parsed = JSON.parse(line)
        if (parsed.session_id) return parsed.session_id
        if (parsed.type === 'result' && parsed.session_id) return parsed.session_id
      }
    } catch {}
    return null
  },

  extractTokens(output: string) {
    try {
      const lines = output.split('\n').filter(Boolean)
      for (const line of lines) {
        const parsed = JSON.parse(line)
        if (parsed.type === 'result' && parsed.usage) {
          return {
            input: parsed.usage.input_tokens || 0,
            output: parsed.usage.output_tokens || 0,
          }
        }
      }
    } catch {}
    return null
  },
}
