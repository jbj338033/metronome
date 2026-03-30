export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'killed'

export interface AgentType {
  id: string
  name: string
  command: string
  default_args: string
  created_at: string
}

export interface Agent {
  id: string
  type_id: string
  blueprint: string | null
  session_id: string | null
  pid: number | null
  status: AgentStatus
  model: string | null
  cwd: string | null
  tokens_in: number
  tokens_out: number
  started_at: string | null
  ended_at: string | null
  created_at: string
}

export interface AgentSpawnRequest {
  type_id: string
  blueprint?: string
  model?: string
  cwd: string
  prompt: string
  session_id?: string
  timeout?: number
}
