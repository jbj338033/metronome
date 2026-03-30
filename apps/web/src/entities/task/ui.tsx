import { Link } from 'react-router'
import { cn } from '@/shared/lib/cn'

const statusColor: Record<string, string> = {
  pending: 'border-zinc-700 bg-zinc-900',
  in_progress: 'border-emerald-800 bg-emerald-950/30',
  completed: 'border-zinc-700 bg-zinc-900/50',
  failed: 'border-red-900 bg-red-950/20',
}

interface TaskCardInlineProps {
  id: string
  title: string
  status: string
  blueprint?: string | null
  agent?: string | null
}

export function TaskCardInline({ id, title, status, blueprint }: TaskCardInlineProps) {
  return (
    <Link
      to={`/tasks/${id}`}
      className={cn(
        'flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-zinc-800/50',
        statusColor[status] || 'border-zinc-800',
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm text-zinc-200">{title}</div>
        <div className="flex gap-2 text-xs text-zinc-500">
          <span>{status}</span>
          {blueprint && <span>· {blueprint}</span>}
        </div>
      </div>
      <span className="text-xs text-zinc-600">→</span>
    </Link>
  )
}
