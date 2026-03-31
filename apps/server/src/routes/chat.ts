import { Hono } from 'hono'
import { createMessage, createTask, getMessagesByTask } from '../db/queries'
import { agentManager } from '../agents/manager'
import { broadcast } from '../ws'

export const chatRoutes = new Hono()

chatRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    content: string
    agent_type_id?: string
    blueprint?: string
    model?: string
    project_id?: string
    task_id?: string
    cwd?: string
    auto_spawn?: boolean
  }>()

  let taskId = body.task_id

  if (!taskId) {
    const title = body.content.slice(0, 60).replace(/\n/g, ' ')
    taskId = createTask({
      title,
      description: body.content,
      projectId: body.project_id,
    })

    broadcast('system', 'task:created', { taskId, title })
  }

  const messageId = createMessage({
    taskId,
    role: 'user',
    content: body.content,
  })

  broadcast(`task:${taskId}`, 'message', {
    id: messageId,
    taskId,
    role: 'user',
    content: body.content,
  })

  let agentId: string | null = null
  if (body.auto_spawn !== false && body.agent_type_id && body.cwd) {
    agentId = agentManager.spawn({
      typeId: body.agent_type_id,
      prompt: body.content,
      cwd: body.cwd,
      model: body.model,
      blueprint: body.blueprint,
      taskId,
    })
  }

  return c.json({ taskId, messageId, agentId }, 201)
})

chatRoutes.post('/message', async (c) => {
  const body = await c.req.json<{
    task_id: string
    content: string
    agent_id?: string
  }>()

  const messageId = createMessage({
    taskId: body.task_id,
    role: 'user',
    content: body.content,
  })

  if (body.agent_id) {
    agentManager.sendInput(body.agent_id, body.content)
  }

  broadcast(`task:${body.task_id}`, 'message', {
    id: messageId,
    taskId: body.task_id,
    role: 'user',
    content: body.content,
  })

  return c.json({ messageId }, 201)
})

chatRoutes.get('/messages/:taskId', (c) => {
  const messages = getMessagesByTask(c.req.param('taskId'))
  return c.json(messages)
})
