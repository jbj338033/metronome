export type AgentStatus = 'idle' | 'running' | 'completed' | 'failed' | 'killed' | 'interrupted'

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
  task_id?: string
  timeout?: number
  system_prompt?: string
}

export interface AgentLog {
  id: number
  agent_id: string
  task_id: string | null
  stream: 'stdout' | 'stderr'
  content: string
  parsed_type: string | null
  timestamp: string
}

export interface RunningAgent {
  agentId: string
  adapterId: string
  taskId: string | null
  pid: number | undefined
}

export interface AgentStats {
  model: string
  count: number
  tokens_in: number
  tokens_out: number
  estimated_cost: number
}

export interface ModelTier {
  name: string
  models: string[]
  input_cost: number
  output_cost: number
}

export interface AgentStatsResponse {
  stats: AgentStats[]
  tiers: ModelTier[]
}
