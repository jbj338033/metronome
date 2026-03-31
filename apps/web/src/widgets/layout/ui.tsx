import { useEffect, useState } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router'
import {
  Activity,
  Rocket,
  Clock,
  Settings,
  Plus,
  FolderOpen,
} from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { useAppStore } from '@/shared/stores/app'
import { useAgentStore } from '@/entities/agent/model/store'
import { useProjectStore } from '@/entities/project/model/store'
import { api } from '@/shared/api/client'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/dialog'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { DirectoryPicker } from '@/widgets/directory-picker/ui'
import { CommandPalette } from '@/widgets/command-palette/ui'
import type { LucideIcon } from 'lucide-react'

const nav: { to: string; label: string; key: string; icon: LucideIcon }[] = [
  { to: '/live', label: 'Live', key: '1', icon: Activity },
  { to: '/launch', label: 'Launch', key: '2', icon: Rocket },
  { to: '/history', label: 'History', key: '3', icon: Clock },
  { to: '/config', label: 'Config', key: '4', icon: Settings },
]

export function RootLayout() {
  const runningCount = useAgentStore((s) => s.runningAgents.length)
  const projects = useProjectStore((s) => s.projects)
  const activeProjectId = useProjectStore((s) => s.activeProjectId)
  const setActiveProject = useProjectStore((s) => s.setActiveProject)
  const fetchProjects = useProjectStore((s) => s.fetchProjects)
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
        navigate('/launch')
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

        <aside className="flex w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-3 py-5">
          <div className="mb-8 px-3">
            <span className="text-base font-bold tracking-tight text-sidebar-foreground">metronome</span>
          </div>

          <nav className="flex flex-col gap-1">
            {nav.map(({ to, label, key, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/live'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition-colors duration-150',
                    isActive
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/60 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                  )
                }
              >
                <Icon size={20} strokeWidth={1.5} />
                <span className="flex-1">{label}</span>
                {label === 'Live' && runningCount > 0 && (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400">
                    <StatusIcon status="in_progress" className="size-2.5" /> {runningCount}
                  </span>
                )}
                <kbd className="text-[10px] text-sidebar-foreground/40">{key}</kbd>
              </NavLink>
            ))}
          </nav>

          <div className="mt-4 flex min-h-0 flex-1 flex-col border-t border-sidebar-border pt-3 px-1">
            <div className="flex items-center justify-between px-1 mb-1.5">
              <span className="text-[13px] text-sidebar-foreground/40">
                Projects
              </span>
              <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
                <DialogTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="rounded p-0.5 text-sidebar-foreground/40 hover:text-sidebar-foreground transition-colors">
                        <Plus size={14} strokeWidth={1.5} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="text-xs">
                      new project
                    </TooltipContent>
                  </Tooltip>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle className="text-sm">new project</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="project name"
                      className="h-8 text-xs"
                    />
                    <DirectoryPicker
                      value={newPath}
                      onChange={setNewPath}
                      className="w-full"
                    />
                    <Button
                      onClick={handleCreateProject}
                      disabled={!newName.trim() || !newPath.trim()}
                      className="w-full"
                      size="sm"
                    >
                      create project
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="flex flex-col gap-0.5 overflow-auto">
              <button
                onClick={() => setActiveProject(null)}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors',
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
                    'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs transition-colors truncate',
                    activeProjectId === p.id
                      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                      : 'text-sidebar-foreground/50 hover:text-sidebar-foreground',
                  )}
                >
                  <FolderOpen size={12} strokeWidth={1.5} className="shrink-0 opacity-70" />
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto px-2 text-xs text-sidebar-foreground/30">
            ⌘K command
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-surface-0">
          <Outlet />
        </main>
      </div>
    </TooltipProvider>
  )
}
