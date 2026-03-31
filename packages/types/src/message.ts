export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  task_id: string | null
  role: MessageRole
  content: string
  agent_id: string | null
  metadata: string
  created_at: string
}

export interface SendMessageRequest {
  content: string
  agent_type_id?: string
  blueprint?: string
  model?: string
  project_id?: string
  task_id?: string
  cwd?: string
  auto_spawn?: boolean
}

export interface SendMessageResponse {
  taskId: string
  messageId: string
  agentId: string | null
}

export interface SendFollowUpRequest {
  task_id: string
  content: string
  agent_id?: string
}

export interface SendFollowUpResponse {
  messageId: string
}
