import { useEffect } from 'react'
import { Outlet, NavLink } from 'react-router'
import { cn } from '@/shared/lib/cn'
import { useAppStore } from '@/shared/stores/app'

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
  const init = useAppStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <div className="flex h-screen overflow-hidden">
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
