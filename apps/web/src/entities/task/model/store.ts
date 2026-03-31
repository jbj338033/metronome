import { create } from 'zustand'
import type { Task, ServerMessage } from '@metronome/types'
import { api } from '@/shared/api/client'

interface TaskState {
  tasks: Task[]

  fetchTasks: (projectId?: string) => Promise<void>
  handleWsMessage: (msg: ServerMessage) => void
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],

  async fetchTasks(projectId?: string) {
    const tasks = await api.tasks.list(projectId)
    set({ tasks })
  },

  handleWsMessage(msg: ServerMessage) {
    const { topic, event } = msg
    if (topic.startsWith('task:') || event === 'task:created') {
      get().fetchTasks()
    }
  },
}))
