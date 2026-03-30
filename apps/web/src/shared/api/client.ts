const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error(err.error || res.statusText)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  agents: {
    list: () => request<any[]>('/agents'),
    types: () => request<any[]>('/agents/types'),
    availability: () => request<Record<string, boolean>>('/agents/availability'),
    running: () => request<any[]>('/agents/running'),
    get: (id: string) => request<any>(`/agents/${id}`),
    logs: (id: string) => request<any[]>(`/agents/${id}/logs`),
    spawn: (body: any) => request<{ agentId: string }>('/agents/spawn', { method: 'POST', body: JSON.stringify(body) }),
    kill: (id: string) => request<void>(`/agents/${id}`, { method: 'DELETE' }),
  },
  tasks: {
    list: (projectId?: string) => request<any[]>(`/tasks${projectId ? `?project_id=${projectId}` : ''}`),
    get: (id: string) => request<any>(`/tasks/${id}`),
    subtasks: (id: string) => request<any[]>(`/tasks/${id}/subtasks`),
    messages: (id: string) => request<any[]>(`/tasks/${id}/messages`),
    create: (body: any) => request<{ id: string }>('/tasks', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => request<any>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/tasks/${id}`, { method: 'DELETE' }),
  },
  chat: {
    send: (body: any) => request<{ taskId: string; messageId: string; agentId: string | null }>('/chat', { method: 'POST', body: JSON.stringify(body) }),
    message: (body: any) => request<{ messageId: string }>('/chat/message', { method: 'POST', body: JSON.stringify(body) }),
    messages: (taskId: string) => request<any[]>(`/chat/messages/${taskId}`),
  },
}
