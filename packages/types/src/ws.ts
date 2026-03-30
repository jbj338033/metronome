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
