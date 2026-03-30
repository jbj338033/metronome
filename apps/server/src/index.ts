import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serve } from '@hono/node-server'
import { injectWebSocket, createNodeWebSocket } from '@hono/node-ws'
import { agentRoutes } from './routes/agents'
import { taskRoutes } from './routes/tasks'
import { chatRoutes } from './routes/chat'
import { pipelineRoutes } from './routes/pipelines'
import { blueprintRoutes } from './routes/blueprints'
import { handleWebSocket } from './ws'
import { initDb } from './db'
import { agentManager } from './agents/manager'

const app = new Hono()
const { upgradeWebSocket, injectWebSocket: inject } = createNodeWebSocket({ app })

app.use('*', cors())

app.route('/api/agents', agentRoutes)
app.route('/api/tasks', taskRoutes)
app.route('/api/chat', chatRoutes)
app.route('/api/pipelines', pipelineRoutes)
app.route('/api/blueprints', blueprintRoutes)

app.get('/ws', upgradeWebSocket(handleWebSocket))

app.get('/health', (c) => c.json({ status: 'ok' }))

initDb()
agentManager.recover()

const port = Number(process.env.PORT) || 3000
const server = serve({ fetch: app.fetch, port }, () => {
  console.log(`metronome server running on http://localhost:${port}`)
})

inject(server)
