import { create } from 'zustand'
import type { Task, Agent, ServerMessage } from '@metronome/types'
import { api } from '../api/client'
import { wsClient } from '../api/ws'

interface Project {
  id: string
  name: string
  path: string
}

interface AppState {
  tasks: Task[]
  agents: Agent[]
  projects: Project[]
  activeProjectId: string | null
  runningAgents: Array<{ agentId: string; adapterId: string; taskId: string | null; pid: number }>
  agentOutput: Map<string, string[]>
  initialized: boolean

  init: () => Promise<void>
  fetchTasks: () => Promise<void>
  fetchAgents: () => Promise<void>
  fetchProjects: () => Promise<void>
  setActiveProject: (id: string | null) => void
  handleWsMessage: (msg: ServerMessage) => void
}

export const useAppStore = create<AppState>((set, get) => ({
  tasks: [],
  agents: [],
  projects: [],
  activeProjectId: null,
  runningAgents: [],
  agentOutput: new Map(),
  initialized: false,

  async init() {
    if (get().initialized) return
    await Promise.all([get().fetchTasks(), get().fetchAgents(), get().fetchProjects()])

    const running = await api.agents.running()
    set({ runningAgents: running, initialized: true })

    wsClient.connect()
    wsClient.onMessage(get().handleWsMessage)

    // 활성 에이전트 구독
    for (const r of running) {
      wsClient.subscribe([`agent:${r.agentId}`, `task:${r.taskId}`])
    }
  },

  async fetchTasks() {
    const tasks = await api.tasks.list()
    set({ tasks })
  },

  async fetchAgents() {
    const agents = await api.agents.list()
    set({ agents })
  },

  async fetchProjects() {
    const projects = await api.projects.list()
    set({ projects })
  },

  setActiveProject(id: string | null) {
    set({ activeProjectId: id })
    get().fetchTasks()
  },

  handleWsMessage(msg: ServerMessage) {
    const { topic, event, data } = msg
    const d = data as any

    if (event === 'output' && topic.startsWith('agent:')) {
      set((state) => {
        const map = new Map(state.agentOutput)
        const agentId = topic.replace('agent:', '')
        const lines = map.get(agentId) || []
        map.set(agentId, [...lines, d.content])
        return { agentOutput: map }
      })
    }

    if (event === 'status' && topic.startsWith('agent:')) {
      if (d.status === 'running') {
        set((state) => ({
          runningAgents: [...state.runningAgents, { agentId: d.agentId, adapterId: '', taskId: d.taskId, pid: d.pid }],
        }))
        wsClient.subscribe([`agent:${d.agentId}`])
        if (d.taskId) wsClient.subscribe([`task:${d.taskId}`])
      } else {
        set((state) => ({
          runningAgents: state.runningAgents.filter((r) => r.agentId !== d.agentId),
        }))
      }
      get().fetchAgents()
    }

    if (topic.startsWith('task:') || event === 'task:created') {
      get().fetchTasks()
    }
  },
}))
