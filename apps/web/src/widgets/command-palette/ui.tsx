import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search } from 'lucide-react'
import { useTaskStore } from '@/entities/task/model/store'
import { cn } from '@/shared/lib/cn'
import { Separator } from '@/shared/ui/separator'
import { ScrollArea } from '@/shared/ui/scroll-area'

interface Command {
  id: string
  label: string
  hint?: string
  group: 'nav' | 'task'
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const tasks = useTaskStore((s) => s.tasks)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
        setQuery('')
        setSelectedIdx(0)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const commands = useMemo<Command[]>(() => {
    const base: Command[] = [
      { id: 'nav:live', label: 'Go to Live', hint: '1', group: 'nav', action: () => navigate('/live') },
      { id: 'nav:launch', label: 'Go to Launch', hint: '2', group: 'nav', action: () => navigate('/launch') },
      { id: 'nav:history', label: 'Go to History', hint: '3', group: 'nav', action: () => navigate('/history') },
      { id: 'nav:config', label: 'Go to Config', hint: '4', group: 'nav', action: () => navigate('/config') },
      { id: 'action:new-launch', label: 'New Launch', hint: '⌘N', group: 'nav', action: () => navigate('/launch') },
    ]

    const taskCmds: Command[] = tasks.slice(0, 10).map((t) => ({
      id: `task:${t.id}`,
      label: `Task: ${t.title}`,
      hint: t.status,
      group: 'task',
      action: () => navigate('/history'),
    }))

    return [...base, ...taskCmds]
  }, [navigate, tasks])

  const filtered = useMemo(() => {
    if (!query) return commands
    const q = query.toLowerCase()
    return commands.filter((c) => c.label.toLowerCase().includes(q))
  }, [commands, query])

  useEffect(() => {
    setSelectedIdx(0)
  }, [query])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIdx((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIdx]) {
      filtered[selectedIdx].action()
      setOpen(false)
    }
  }

  if (!open) return null

  const navItems = filtered.filter((c) => c.group === 'nav')
  const taskItems = filtered.filter((c) => c.group === 'task')

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/60 animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      />

      {/* palette */}
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search size={14} className="text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="type a command..."
            className="w-full bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <ScrollArea className="max-h-64">
          <div className="p-1">
            {filtered.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">no results</div>
            ) : (
              <>
                {navItems.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      navigation
                    </div>
                    {navItems.map((cmd) => {
                      const globalIdx = filtered.indexOf(cmd)
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => { cmd.action(); setOpen(false) }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                            globalIdx === selectedIdx
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent/50',
                          )}
                        >
                          <span className="flex-1">{cmd.label}</span>
                          {cmd.hint && (
                            <span className="font-mono text-xs text-muted-foreground/50">{cmd.hint}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
                {navItems.length > 0 && taskItems.length > 0 && (
                  <Separator className="my-1" />
                )}
                {taskItems.length > 0 && (
                  <div>
                    <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground/50">
                      tasks
                    </div>
                    {taskItems.map((cmd) => {
                      const globalIdx = filtered.indexOf(cmd)
                      return (
                        <button
                          key={cmd.id}
                          onClick={() => { cmd.action(); setOpen(false) }}
                          className={cn(
                            'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                            globalIdx === selectedIdx
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground hover:bg-accent/50',
                          )}
                        >
                          <span className="flex-1 truncate">{cmd.label}</span>
                          {cmd.hint && (
                            <span className="font-mono text-xs text-muted-foreground/50">{cmd.hint}</span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
