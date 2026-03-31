import { create } from 'zustand'
import { api } from '@/shared/api/client'

interface ProjectState {
  projects: Array<{ id: string; name: string; path: string }>
  activeProjectId: string | null
  onProjectChange: ((id: string | null) => void) | null

  fetchProjects: () => Promise<void>
  setActiveProject: (id: string | null) => void
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  onProjectChange: null,

  async fetchProjects() {
    const projects = await api.projects.list()
    set({ projects })
  },

  setActiveProject(id: string | null) {
    set({ activeProjectId: id })
    get().onProjectChange?.(id)
  },
}))
