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
  project_id?: string
  task_id?: string
}
