export interface Project {
  id: string
  name: string
  path: string
  created_at: string
}

export interface DirEntry {
  name: string
  type: 'directory'
}

export interface DirListing {
  path: string
  parent: string | null
  entries: DirEntry[]
}
