import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { useAppStore } from '@/shared/stores/app'
import { cn } from '@/shared/lib/cn'

interface Command {
  id: string
  label: string
  hint?: string
  action: () => void
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIdx, setSelectedIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const tasks = useAppStore((s) => s.tasks)

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
      { id: 'nav:dashboard', label: 'Go to Dashboard', hint: '1', action: () => navigate('/') },
      { id: 'nav:chat', label: 'Go to Chat', hint: '2', action: () => navigate('/chat') },
      { id: 'nav:tasks', label: 'Go to Tasks', hint: '3', action: () => navigate('/tasks') },
      { id: 'nav:pipelines', label: 'Go to Pipelines', hint: '4', action: () => navigate('/pipelines/editor') },
      { id: 'nav:agents', label: 'Go to Agents', hint: '5', action: () => navigate('/agents') },
      { id: 'action:new-chat', label: 'New Chat', hint: '⌘N', action: () => navigate('/chat') },
    ]

    const taskCmds: Command[] = tasks.slice(0, 10).map((t) => ({
      id: `task:${t.id}`,
      label: `Task: ${t.title}`,
      hint: t.status,
      action: () => navigate(`/tasks/${t.id}`),
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

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={() => setOpen(false)} />

      {/* palette */}
      <div className="relative w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-900 shadow-2xl">
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="type a command..."
          className="w-full border-b border-zinc-800 bg-transparent px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 outline-none"
        />
        <div className="max-h-64 overflow-auto p-1">
          {filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-xs text-zinc-600">no results</div>
          ) : (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                onClick={() => { cmd.action(); setOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors',
                  i === selectedIdx ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-400 hover:bg-zinc-800/50',
                )}
              >
                <span className="flex-1">{cmd.label}</span>
                {cmd.hint && (
                  <span className="font-[var(--font-mono)] text-xs text-zinc-600">{cmd.hint}</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
