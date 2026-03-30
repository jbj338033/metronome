import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router'
import { cn } from '@/shared/lib/cn'
import { useAppStore } from '@/shared/stores/app'
import { api } from '@/shared/api/client'
import { CommandPalette } from '@/widgets/command-palette/ui'

const nav = [
  { to: '/', label: 'Dashboard', key: '1' },
  { to: '/chat', label: 'Chat', key: '2' },
  { to: '/tasks', label: 'Tasks', key: '3' },
  { to: '/pipelines/editor', label: 'Pipelines', key: '4' },
  { to: '/agents', label: 'Agents', key: '5' },
]

export function RootLayout() {
  const runningCount = useAppStore((s) => s.runningAgents.length)
  const pendingCount = useAppStore((s) => s.tasks.filter((t) => t.status === 'pending').length)
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const fetchProjects = useAppStore((s) => s.fetchProjects)
  const init = useAppStore((s) => s.init)
  const navigate = useNavigate()

  const [showNewProject, setShowNewProject] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPath, setNewPath] = useState('')

  useEffect(() => { init() }, [init])

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
      const idx = Number(e.key) - 1
      if (idx >= 0 && idx < nav.length && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        navigate(nav[idx].to)
        return
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        navigate('/chat')
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault()
        navigate('/chat')
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [navigate])

  async function handleCreateProject() {
    if (!newName.trim() || !newPath.trim()) return
    await api.projects.create({ name: newName.trim(), path: newPath.trim() })
    setNewName('')
    setNewPath('')
    setShowNewProject(false)
    fetchProjects()
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <CommandPalette />

      <aside className="flex w-48 shrink-0 flex-col border-r border-zinc-800 bg-zinc-950 px-2 py-4">
        <div className="mb-6 px-2 text-sm font-semibold tracking-tight text-zinc-100">
          Metronome
        </div>

        <nav className="flex flex-col gap-0.5">
          {nav.map(({ to, label, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors duration-150',
                  isActive
                    ? 'bg-zinc-800 text-zinc-100'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
                )
              }
            >
              <kbd className="text-[10px] text-zinc-600">{key}</kbd>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Projects */}
        <div className="mt-4 border-t border-zinc-800 pt-3 px-1">
          <div className="flex items-center justify-between px-1 mb-1">
            <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">projects</span>
            <button
              onClick={() => setShowNewProject(!showNewProject)}
              className="text-xs text-zinc-600 hover:text-zinc-400"
            >
              +
            </button>
          </div>

          {showNewProject && (
            <div className="mb-2 space-y-1 px-1">
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="name"
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
              />
              <input
                value={newPath}
                onChange={(e) => setNewPath(e.target.value)}
                placeholder="/path/to/project"
                className="w-full rounded border border-zinc-800 bg-zinc-900 px-1.5 py-1 text-xs text-zinc-300 placeholder-zinc-600 outline-none"
              />
              <button
                onClick={handleCreateProject}
                className="w-full rounded bg-zinc-800 py-1 text-xs text-zinc-300 hover:bg-zinc-700"
              >
                create
              </button>
            </div>
          )}

          <button
            onClick={() => setActiveProject(null)}
            className={cn(
              'flex w-full items-center rounded px-2 py-1 text-xs transition-colors',
              !activeProjectId ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            all projects
          </button>
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p.id)}
              className={cn(
                'flex w-full items-center rounded px-2 py-1 text-xs transition-colors truncate',
                activeProjectId === p.id ? 'bg-zinc-800 text-zinc-200' : 'text-zinc-500 hover:text-zinc-300',
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-auto space-y-2 px-2">
          {(runningCount > 0 || pendingCount > 0) && (
            <div className="flex gap-3 text-xs">
              {runningCount > 0 && <span className="text-emerald-400">● {runningCount}</span>}
              {pendingCount > 0 && <span className="text-zinc-500">○ {pendingCount}</span>}
            </div>
          )}
          <div className="text-xs text-zinc-600">
            <kbd className="rounded border border-zinc-800 px-1 py-0.5 text-[10px]">⌘K</kbd>
            {' '}Command
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}
