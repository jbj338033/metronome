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

interface DirEntry { name: string; type: 'directory' }
interface DirListing { path: string; parent: string | null; entries: DirEntry[] }

export const api = {
  fs: {
    list: (dirPath: string) => request<DirListing>(`/fs/list?path=${encodeURIComponent(dirPath)}`),
  },
  agents: {
    list: () => request<any[]>('/agents'),
    types: () => request<any[]>('/agents/types'),
    availability: () => request<Record<string, boolean>>('/agents/availability'),
    running: () => request<any[]>('/agents/running'),
    get: (id: string) => request<any>(`/agents/${id}`),
    logs: (id: string) => request<any[]>(`/agents/${id}/logs`),
    spawn: (body: any) => request<{ agentId: string }>('/agents/spawn', { method: 'POST', body: JSON.stringify(body) }),
    kill: (id: string) => request<void>(`/agents/${id}`, { method: 'DELETE' }),
    stats: () => request<{ stats: any[]; tiers: any[] }>('/agents/stats'),
    resume: (id: string, prompt: string) => request<{ agentId: string }>(`/agents/${id}/resume`, { method: 'POST', body: JSON.stringify({ prompt }) }),
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
  projects: {
    list: () => request<any[]>('/projects'),
    create: (body: { name: string; path: string }) => request<{ id: string }>('/projects', { method: 'POST', body: JSON.stringify(body) }),
    delete: (id: string) => request<void>(`/projects/${id}`, { method: 'DELETE' }),
  },
  blueprints: {
    list: () => request<any[]>('/blueprints'),
    get: (name: string) => request<any>(`/blueprints/${name}`),
    save: (name: string, body: any) => request<any>(`/blueprints/${name}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (name: string) => request<void>(`/blueprints/${name}`, { method: 'DELETE' }),
  },
  pipelines: {
    list: () => request<any[]>('/pipelines'),
    get: (name: string) => request<any>(`/pipelines/${name}`),
    run: (name: string, body: { prompt: string; cwd: string; project_id?: string }) => request<{ runId: string }>(`/pipelines/${name}/run`, { method: 'POST', body: JSON.stringify(body) }),
    runDynamic: (body: { prompt: string; cwd: string; project_id?: string }) => request<{ runId: string }>('/pipelines/run-dynamic', { method: 'POST', body: JSON.stringify(body) }),
    requestReplan: (id: string) => request<any>(`/pipelines/runs/${id}/replan`, { method: 'POST' }),
    listRuns: () => request<any[]>('/pipelines/runs'),
    cancelRun: (id: string) => request<any>(`/pipelines/runs/${id}/cancel`, { method: 'POST' }),
    approveStep: (runId: string, stepId: string) => request<any>(`/pipelines/runs/${runId}/approve/${stepId}`, { method: 'POST' }),
    rejectStep: (runId: string, stepId: string) => request<any>(`/pipelines/runs/${runId}/reject/${stepId}`, { method: 'POST' }),
    getRun: (id: string) => request<any>(`/pipelines/runs/${id}`),
    getRunSteps: (id: string) => request<any[]>(`/pipelines/runs/${id}/steps`),
    getRunFiles: (id: string) => request<any[]>(`/pipelines/runs/${id}/files`),
  },
  chat: {
    send: (body: any) => request<{ taskId: string; messageId: string; agentId: string | null }>('/chat', { method: 'POST', body: JSON.stringify(body) }),
    message: (body: any) => request<{ messageId: string }>('/chat/message', { method: 'POST', body: JSON.stringify(body) }),
    messages: (taskId: string) => request<any[]>(`/chat/messages/${taskId}`),
  },
}
