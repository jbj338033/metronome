import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router'
import {
  LayoutDashboard,
  MessageSquare,
  ListTodo,
  Workflow,
  Bot,
  Plus,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { useAppStore } from '@/shared/stores/app'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { CommandPalette } from '@/widgets/command-palette/ui'
import type { LucideIcon } from 'lucide-react'

const nav: { to: string; label: string; key: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Dashboard', key: '1', icon: LayoutDashboard },
  { to: '/chat', label: 'Chat', key: '2', icon: MessageSquare },
  { to: '/tasks', label: 'Tasks', key: '3', icon: ListTodo },
  { to: '/pipelines/editor', label: 'Pipelines', key: '4', icon: Workflow },
  { to: '/agents', label: 'Agents', key: '5', icon: Bot },
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
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden">
        <CommandPalette />

        <aside className="flex w-52 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-2 py-4">
          <div className="mb-6 px-2 text-sm font-semibold tracking-tight text-sidebar-foreground">
            Metronome
          </div>

          <nav className="flex flex-col gap-0.5">
            {nav.map(({ to, label, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )
                }
              >
                <Icon size={16} strokeWidth={1.5} />
                <span className="flex-1">{label}</span>
                <kbd className="text-[10px] text-sidebar-foreground/30">{key}</kbd>
              </NavLink>
            ))}
          </nav>

          {/* Projects */}
          <div className="mt-4 border-t border-sidebar-border pt-3 px-1">
            <div className="flex items-center justify-between px-1 mb-1">
              <span className="text-[10px] font-medium uppercase tracking-wider text-sidebar-foreground/40">
                projects
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setShowNewProject(!showNewProject)}
                    className="rounded p-0.5 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors"
                  >
                    <Plus size={14} strokeWidth={1.5} />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  new project
                </TooltipContent>
              </Tooltip>
            </div>

            {showNewProject && (
              <div className="mb-2 space-y-1.5 px-1">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="name"
                  className="h-7 text-xs"
                />
                <Input
                  value={newPath}
                  onChange={(e) => setNewPath(e.target.value)}
                  placeholder="/path/to/project"
                  className="h-7 text-xs"
                />
                <Button
                  onClick={handleCreateProject}
                  variant="secondary"
                  size="sm"
                  className="w-full text-xs"
                >
                  create
                </Button>
              </div>
            )}

            <button
              onClick={() => setActiveProject(null)}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors',
                !activeProjectId
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
              )}
            >
              all projects
            </button>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => setActiveProject(p.id)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1 text-xs transition-colors truncate',
                  activeProjectId === p.id
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
                )}
              >
                <FolderOpen size={12} strokeWidth={1.5} className="shrink-0 opacity-50" />
                {p.name}
              </button>
            ))}
          </div>

          <div className="mt-auto space-y-2 px-2">
            {(runningCount > 0 || pendingCount > 0) && (
              <div className="flex items-center gap-3 text-xs">
                {runningCount > 0 && (
                  <span className="flex items-center gap-1 text-emerald-400">
                    <StatusIcon status="in_progress" className="size-3" /> {runningCount}
                  </span>
                )}
                {pendingCount > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <StatusIcon status="pending" className="size-3" /> {pendingCount}
                  </span>
                )}
              </div>
            )}
            <div className="text-xs text-sidebar-foreground/40">
              <kbd className="rounded border border-sidebar-border px-1 py-0.5 text-[10px] font-mono">⌘K</kbd>
              {' '}Command
            </div>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}
