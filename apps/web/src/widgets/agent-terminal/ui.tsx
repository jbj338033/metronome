import { useEffect, useRef } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAgentStore } from '@/entities/agent/model/store'

interface AgentTerminalProps {
  agentId: string
}

export function AgentTerminal({ agentId }: AgentTerminalProps) {
  const output = useAgentStore(useShallow((s) => s.agentOutput.get(agentId) || []))
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [output.length])

  if (output.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <span className="font-mono text-xs text-muted-foreground">
          <span className="inline-block w-1.5 h-3.5 bg-muted-foreground/50 animate-pulse" />
          {' '}waiting for output...
        </span>
      </div>
    )
  }

  return (
    <div className="h-full overflow-auto bg-surface-0 p-3 font-mono text-xs leading-6 text-muted-foreground">
      {output.map((line, i) => (
        <div key={i} className="hover:bg-surface-1 transition-colors">
          {line}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
