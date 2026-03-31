import { create } from 'zustand'
import type { Agent, ServerMessage } from '@metronome/types'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'

interface AgentState {
  agents: Agent[]
  runningAgents: Array<{ agentId: string; adapterId: string; taskId: string | null; pid: number }>
  agentOutput: Map<string, string[]>

  fetchAgents: () => Promise<void>
  fetchRunning: () => Promise<void>
  handleWsMessage: (msg: ServerMessage) => void
}

export const useAgentStore = create<AgentState>((set, get) => ({
  agents: [],
  runningAgents: [],
  agentOutput: new Map(),

  async fetchAgents() {
    const agents = await api.agents.list()
    set({ agents })
  },

  async fetchRunning() {
    const running = await api.agents.running()
    set({ runningAgents: running })
    for (const r of running) {
      wsClient.subscribe([`agent:${r.agentId}`])
      if (r.taskId) wsClient.subscribe([`task:${r.taskId}`])
    }
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
  },
}))
