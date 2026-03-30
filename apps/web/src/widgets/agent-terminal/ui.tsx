import { useEffect, useRef } from 'react'
import { useAppStore } from '@/shared/stores/app'

interface AgentTerminalProps {
  agentId: string
}

export function AgentTerminal({ agentId }: AgentTerminalProps) {
  const output = useAppStore((s) => s.agentOutput.get(agentId) || [])
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output.length])

  if (output.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-zinc-600">
        waiting for output...
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-zinc-950 p-3 font-[var(--font-mono)] text-xs leading-5 text-zinc-400">
      {output.map((line, i) => (
        <div key={i} className="hover:bg-zinc-900/50">
          {line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
