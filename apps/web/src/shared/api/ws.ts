import type { ServerMessage, ClientMessage } from '@metronome/types'

type MessageHandler = (msg: ServerMessage) => void

class WebSocketClient {
  private ws: WebSocket | null = null
  private handlers = new Set<MessageHandler>()
  private topics = new Set<string>()
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private url: string

  constructor() {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
    this.url = `${proto}//${location.host}/ws`
  }

  connect() {
    if (this.ws?.readyState === WebSocket.OPEN) return

    this.ws = new WebSocket(this.url)

    this.ws.onopen = () => {
      if (this.topics.size > 0) {
        this.send({ type: 'subscribe', payload: { topics: [...this.topics] } })
      }
    }

    this.ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data) as ServerMessage
        for (const handler of this.handlers) {
          handler(msg)
        }
      } catch {}
    }

    this.ws.onclose = () => {
      this.reconnectTimer = setTimeout(() => this.connect(), 3000)
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.ws = null
  }

  subscribe(topics: string[]) {
    for (const t of topics) this.topics.add(t)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'subscribe', payload: { topics } })
    }
  }

  unsubscribe(topics: string[]) {
    for (const t of topics) this.topics.delete(t)
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.send({ type: 'unsubscribe', payload: { topics } })
    }
  }

  sendAgentInput(agentId: string, content: string) {
    this.send({ type: 'agent:input', payload: { agentId, content } })
  }

  onMessage(handler: MessageHandler) {
    this.handlers.add(handler)
    return () => { this.handlers.delete(handler) }
  }

  private send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg))
    }
  }
}

export const wsClient = new WebSocketClient()
