export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled'

export interface Task {
  id: string
  project_id: string | null
  parent_id: string | null
  title: string
  description: string | null
  status: TaskStatus
  agent_id: string | null
  priority: number
  tags: string
  result: string | null
  total_tokens: number
  created_at: string
  updated_at: string
}

export interface CreateTaskRequest {
  title: string
  description?: string
  project_id?: string
  parent_id?: string
  priority?: number
  tags?: string[]
}
