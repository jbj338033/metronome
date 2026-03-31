import { memo } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { cn } from '@/shared/lib/cn'
import { Badge } from '@/shared/ui/badge'

export interface StepNodeData {
  label: string
  blueprint: string
  status?: string
  fanOut?: string
  condition?: string
  approval?: boolean
  selected?: boolean
}

const statusBorder: Record<string, string> = {
  pending: 'border-border',
  running: 'border-emerald-500',
  completed: 'border-emerald-700',
  failed: 'border-red-500',
  skipped: 'border-border',
  awaiting_approval: 'border-yellow-500',
}

export const StepNode = memo(({ data, selected }: NodeProps & { data: StepNodeData }) => {
  const borderColor = data.status ? statusBorder[data.status] || 'border-border' : 'border-border'

  return (
    <div
      className={cn(
        'min-w-[140px] rounded-lg border-2 bg-card px-3 py-2 transition-colors',
        borderColor,
        selected && 'ring-1 ring-ring',
      )}
    >
      <Handle type="target" position={Position.Left} className="!h-2 !w-2 !border-muted-foreground !bg-muted-foreground" />

      <div className="text-sm font-medium text-foreground">{data.label}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">{data.blueprint}</div>

      <div className="mt-1 flex gap-1">
        {data.fanOut && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0">fan-out</Badge>
        )}
        {data.condition && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 text-yellow-500">if</Badge>
        )}
        {data.approval && (
          <Badge variant="secondary" className="text-[10px] px-1 py-0 text-blue-400">approval</Badge>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!h-2 !w-2 !border-muted-foreground !bg-muted-foreground" />
    </div>
  )
})

StepNode.displayName = 'StepNode'
