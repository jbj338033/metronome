export interface AgentSpawnOptions {
  prompt: string
  model?: string
  sessionId?: string
  resume?: boolean
  cwd?: string
  timeout?: number
  systemPrompt?: string
}

export type StreamEventType = 'text' | 'tool_use' | 'tool_result' | 'status' | 'error' | 'done'

export interface AgentStreamEvent {
  type: StreamEventType
  content: string
  metadata?: Record<string, unknown>
  timestamp: number
}

export interface AgentAdapter {
  readonly id: string
  readonly name: string

  checkAvailable(): Promise<boolean>
  buildCommand(opts: AgentSpawnOptions): { cmd: string; args: string[]; env?: Record<string, string> }
  parseOutput(chunk: string): AgentStreamEvent[]
  extractSessionId?(output: string): string | null
  extractTokens?(output: string): { input: number; output: number } | null
}
