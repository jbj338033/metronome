import { EventEmitter } from 'events'

interface MetronomeEvents {
  'agent:completed': [agentId: string, exitCode: number]
  'agent:failed': [agentId: string, exitCode: number | null]
  'approval:response': [runId: string, stepId: string, approved: boolean]
  'step:completed': [runId: string, stepId: string]
  'step:failed': [runId: string, stepId: string]
}

class TypedEmitter extends EventEmitter {
  emit<K extends keyof MetronomeEvents>(event: K, ...args: MetronomeEvents[K]): boolean {
    return super.emit(event, ...args)
  }

  on<K extends keyof MetronomeEvents>(event: K, listener: (...args: MetronomeEvents[K]) => void): this {
    return super.on(event, listener as (...args: unknown[]) => void)
  }

  once<K extends keyof MetronomeEvents>(event: K, listener: (...args: MetronomeEvents[K]) => void): this {
    return super.once(event, listener as (...args: unknown[]) => void)
  }

  removeListener<K extends keyof MetronomeEvents>(event: K, listener: (...args: MetronomeEvents[K]) => void): this {
    return super.removeListener(event, listener as (...args: unknown[]) => void)
  }
}

const key = '__metronome_events__'
if (!(globalThis as any)[key]) {
  const emitter = new TypedEmitter()
  emitter.setMaxListeners(100)
  ;(globalThis as any)[key] = emitter
}

export const events: TypedEmitter = (globalThis as any)[key]
