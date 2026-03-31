import type { ReactNode } from 'react'

export function SectionHeader({
  children,
  count,
  indicator,
}: {
  children: ReactNode
  count?: number
  indicator?: 'active' | null
}) {
  return (
    <div className="flex items-center gap-2 bg-surface-1/50 px-6 py-2.5">
      {indicator === 'active' && (
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      <span className="text-xs font-medium text-muted-foreground">
        {children}
        {count != null && ` (${count})`}
      </span>
    </div>
  )
}
