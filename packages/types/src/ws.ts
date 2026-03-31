import type { AgentStatus } from './agent'
import type { StepStatus, PipelineRunStatus } from './pipeline'

export interface ServerMessage {
  topic: string
  event: string
  data: unknown
  ts: number
}

export interface ClientSubscribeMessage {
  type: 'subscribe'
  payload: { topics: string[] }
}

export interface ClientUnsubscribeMessage {
  type: 'unsubscribe'
  payload: { topics: string[] }
}

export interface ClientAgentInputMessage {
  type: 'agent:input'
  payload: { agentId: string; content: string }
}

export type ClientMessage =
  | ClientSubscribeMessage
  | ClientUnsubscribeMessage
  | ClientAgentInputMessage

export interface AgentOutputEvent {
  type: string
  content: string
  agentId: string
  taskId: string | null
  timestamp?: number
}

export interface AgentStatusEvent {
  agentId: string
  status: AgentStatus
  exitCode?: number | null
  pid?: number
  reason?: string
  taskId: string | null
}

export interface PipelineStepEvent {
  stepId: string
  status: StepStatus
  fanIndex?: number
  attempt?: number
  maxRetries?: number
  fixAttempt?: number
  maxFixes?: number
  structured?: unknown
  reason?: string
}

export interface PipelineStatusEvent {
  runId: string
  status: PipelineRunStatus
}
