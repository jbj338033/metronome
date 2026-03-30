import { Hono } from 'hono'
import { getDb } from '../db'
import { createTask, getTasksByProject, getTaskById, getSubtasks, updateTask, getMessagesByTask } from '../db/queries'

export const taskRoutes = new Hono()

taskRoutes.get('/', (c) => {
  const projectId = c.req.query('project_id')
  return c.json(getTasksByProject(projectId))
})

taskRoutes.get('/:id', (c) => {
  const task = getTaskById(c.req.param('id'))
  if (!task) return c.json({ error: 'not found' }, 404)
  return c.json(task)
})

taskRoutes.get('/:id/subtasks', (c) => {
  return c.json(getSubtasks(c.req.param('id')))
})

taskRoutes.get('/:id/messages', (c) => {
  return c.json(getMessagesByTask(c.req.param('id')))
})

taskRoutes.post('/', async (c) => {
  const body = await c.req.json<{
    title: string
    description?: string
    project_id?: string
    parent_id?: string
    priority?: number
    tags?: string[]
  }>()

  const id = createTask(body)
  return c.json({ id }, 201)
})

taskRoutes.patch('/:id', async (c) => {
  const id = c.req.param('id')
  const task = getTaskById(id)
  if (!task) return c.json({ error: 'not found' }, 404)

  const body = await c.req.json()
  const allowed = ['title', 'description', 'status', 'priority', 'tags', 'result']
  const fields: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) {
      fields[key] = key === 'tags' ? JSON.stringify(body[key]) : body[key]
    }
  }

  if (Object.keys(fields).length > 0) {
    updateTask(id, fields)
  }

  return c.json(getTaskById(id))
})

taskRoutes.delete('/:id', (c) => {
  const id = c.req.param('id')
  const task = getTaskById(id)
  if (!task) return c.json({ error: 'not found' }, 404)

  getDb().prepare('DELETE FROM messages WHERE task_id = ?').run(id)
  getDb().prepare('DELETE FROM tasks WHERE parent_id = ?').run(id)
  getDb().prepare('DELETE FROM tasks WHERE id = ?').run(id)
  return c.body(null, 204)
})
