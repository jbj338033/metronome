import { Link } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Badge } from '@/shared/ui/badge'

const statusStyle: Record<string, string> = {
  pending: 'border-border bg-surface-2',
  in_progress: 'border-emerald-800 bg-emerald-950/30',
  completed: 'border-border bg-surface-2/50',
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
        'flex items-center gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-accent/50',
        statusStyle[status] || 'border-border',
      )}
    >
      <StatusIcon status={status} />
      <div className="flex-1 min-w-0">
        <div className="truncate text-sm text-foreground">{title}</div>
        <div className="flex gap-2 text-xs text-muted-foreground">
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {status === 'in_progress' ? 'running' : status}
          </Badge>
          {blueprint && <span>· {blueprint}</span>}
        </div>
      </div>
      <ChevronRight size={14} className="text-muted-foreground/50" />
    </Link>
  )
}
