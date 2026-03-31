import { cn } from '@/shared/lib/cn'
import { formatRelativeTime } from '@/shared/lib/format'

interface MessageBubbleProps {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  return (
    <div className={cn('flex flex-col gap-1', role === 'user' ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-lg px-3 py-2 text-sm',
          role === 'user'
            ? 'bg-primary/15 text-foreground'
            : 'border-l-2 border-primary/30 bg-surface-1 text-card-foreground',
        )}
      >
        <pre className="whitespace-pre-wrap font-[inherit]">{content}</pre>
      </div>
      {timestamp && (
        <span className="px-1 font-mono text-[10px] text-muted-foreground/50">
          {formatRelativeTime(timestamp)}
        </span>
      )}
    </div>
  )
}
