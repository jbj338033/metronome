import { create } from 'zustand'
import { wsClient } from '../api/ws'
import { useAgentStore } from '@/entities/agent/model/store'
import { useTaskStore } from '@/entities/task/model/store'
import { useProjectStore } from '@/entities/project/model/store'
import type { ServerMessage } from '@metronome/types'

interface AppState {
  initialized: boolean
  init: () => Promise<void>
}

export const useAppStore = create<AppState>((set, get) => ({
  initialized: false,

  async init() {
    if (get().initialized) return

    // 프로젝트 변경 시 태스크 리페치 연결
    useProjectStore.setState({
      onProjectChange: () => useTaskStore.getState().fetchTasks(),
    })

    await Promise.all([
      useAgentStore.getState().fetchAgents(),
      useAgentStore.getState().fetchRunning(),
      useTaskStore.getState().fetchTasks(),
      useProjectStore.getState().fetchProjects(),
    ])

    set({ initialized: true })

    wsClient.connect()
    wsClient.onMessage((msg: ServerMessage) => {
      useAgentStore.getState().handleWsMessage(msg)
      useTaskStore.getState().handleWsMessage(msg)
    })
  },
}))
