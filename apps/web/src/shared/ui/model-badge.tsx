import { cn } from '@/shared/lib/cn'

const styles: Record<string, string> = {
  opus: 'bg-violet-500/15 text-violet-400',
  sonnet: 'bg-blue-500/15 text-blue-400',
  haiku: 'bg-zinc-500/15 text-zinc-400',
}

export function ModelBadge({ model, className }: { model: string; className?: string }) {
  return (
    <span
      className={cn(
        'rounded px-1.5 py-0.5 text-[11px] font-mono',
        styles[model] ?? styles.haiku,
        className,
      )}
    >
      {model}
    </span>
  )
}
