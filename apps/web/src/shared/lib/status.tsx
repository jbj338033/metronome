import type { LucideIcon } from 'lucide-react'
import {
  Circle,
  Loader2,
  CheckCircle2,
  XCircle,
  MinusCircle,
  AlertTriangle,
  Pause,
  RotateCw,
} from 'lucide-react'
import { cn } from './cn'

const config: Record<string, { icon: LucideIcon; color: string; spin?: boolean }> = {
  pending: { icon: Circle, color: 'text-muted-foreground' },
  in_progress: { icon: Loader2, color: 'text-emerald-400', spin: true },
  completed: { icon: CheckCircle2, color: 'text-muted-foreground' },
  failed: { icon: XCircle, color: 'text-red-400' },
  cancelled: { icon: MinusCircle, color: 'text-muted-foreground/60' },
  interrupted: { icon: AlertTriangle, color: 'text-yellow-400' },
  retrying: { icon: RotateCw, color: 'text-yellow-400', spin: true },
  awaiting_approval: { icon: Pause, color: 'text-yellow-400' },
  killed: { icon: XCircle, color: 'text-yellow-400' },
}

const fallback = config.pending

export function StatusIcon({ status, className }: { status: string; className?: string }) {
  const c = config[status] ?? fallback
  const Icon = c.icon
  return <Icon className={cn('size-3.5', c.color, c.spin && 'animate-spin', className)} />
}

export function statusColor(status: string) {
  return (config[status] ?? fallback).color
}

export const pipelineStatusMap: Record<string, string> = {
  running: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  interrupted: 'interrupted',
  replanning: 'pending',
  awaiting_approval: 'awaiting_approval',
  pending: 'pending',
  skipped: 'cancelled',
  retrying: 'pending',
}
