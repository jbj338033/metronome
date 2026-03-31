import { cn } from '@/shared/lib/cn'

function formatRelativeTime(timestamp: string) {
  const date = new Date(timestamp.endsWith('Z') || timestamp.includes('+') ? timestamp : timestamp + 'Z')
  const ms = Date.now() - date.getTime()
  if (Number.isNaN(ms)) return ''
  const s = Math.floor(ms / 1000)
  if (s < 60) return '방금'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  return `${Math.floor(h / 24)}일 전`
}

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
            ? 'bg-secondary text-secondary-foreground'
            : 'border-l-2 border-muted bg-card text-card-foreground',
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
