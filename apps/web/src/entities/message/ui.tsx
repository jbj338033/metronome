import { cn } from '@/shared/lib/cn'

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
            ? 'bg-zinc-800 text-zinc-100'
            : 'bg-zinc-900 text-zinc-300',
        )}
      >
        <pre className="whitespace-pre-wrap font-[inherit]">{content}</pre>
      </div>
      {timestamp && (
        <span className="px-1 font-[var(--font-mono)] text-[10px] text-zinc-700">
          {new Date(timestamp + 'Z').toLocaleTimeString()}
        </span>
      )}
    </div>
  )
}
