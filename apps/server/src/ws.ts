import type { WSContext } from 'hono/ws'
import { agentManager } from './agents/manager'

const clients = new Map<string, { ws: WSContext; topics: Set<string> }>()
let clientId = 0

export function handleWebSocket(c: any) {
  return {
    onOpen(_event: Event, ws: WSContext) {
      const id = String(++clientId)
      clients.set(id, { ws, topics: new Set() })
      ws.send(JSON.stringify({
        topic: 'system',
        event: 'connected',
        data: { clientId: id },
        ts: Date.now(),
      }))
    },

    onMessage(event: MessageEvent, ws: WSContext) {
      try {
        const msg = JSON.parse(String(event.data))
        const client = [...clients.entries()].find(([, v]) => v.ws === ws)
        if (!client) return

        const [id, state] = client

        if (msg.type === 'subscribe') {
          for (const topic of msg.payload.topics) {
            state.topics.add(topic)
          }
        }

        if (msg.type === 'unsubscribe') {
          for (const topic of msg.payload.topics) {
            state.topics.delete(topic)
          }
        }

        if (msg.type === 'agent:input') {
          agentManager.sendInput(msg.payload.agentId, msg.payload.content)
        }
      } catch {
        // ignore malformed messages
      }
    },

    onClose(_event: CloseEvent, ws: WSContext) {
      for (const [id, state] of clients) {
        if (state.ws === ws) {
          clients.delete(id)
          break
        }
      }
    },
  }
}

export function broadcast(topic: string, event: string, data: unknown) {
  const msg = JSON.stringify({ topic, event, data, ts: Date.now() })
  for (const [, { ws, topics }] of clients) {
    if (topics.has(topic) || topic === 'system') {
      ws.send(msg)
    }
  }
}
