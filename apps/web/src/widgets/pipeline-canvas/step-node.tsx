import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'

export interface StepNodeData {
  label: string
  blueprint: string
  status?: string
  fanOut?: string
  condition?: string
  approval?: boolean
  selected?: boolean
}

const statusColor: Record<string, string> = {
  pending: 'border-zinc-700',
  running: 'border-emerald-500',
  completed: 'border-emerald-700',
  failed: 'border-red-500',
  skipped: 'border-zinc-800',
  awaiting_approval: 'border-yellow-500',
}

export const StepNode = memo(({ data, selected }: NodeProps & { data: StepNodeData }) => {
  const borderColor = data.status ? statusColor[data.status] || 'border-zinc-700' : 'border-zinc-700'

  return (
    <div
      className={cn(
        'min-w-[140px] rounded-lg border-2 bg-zinc-900 px-3 py-2 transition-colors',
        borderColor,
        selected && 'ring-1 ring-zinc-500',
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-zinc-600 !bg-zinc-400" />

      <div className="text-sm font-medium text-zinc-200">{data.label}</div>
      <div className="mt-0.5 text-xs text-zinc-500">{data.blueprint}</div>

      <div className="mt-1 flex gap-1">
        {data.fanOut && (
          <span className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-zinc-400">fan-out</span>
        )}
        {data.condition && (
          <span className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-yellow-500">if</span>
        )}
        {data.approval && (
          <span className="rounded bg-zinc-800 px-1 py-0.5 text-[10px] text-blue-400">approval</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-zinc-600 !bg-zinc-400" />
    </div>
  )
})

StepNode.displayName = 'StepNode'
