import { Hono } from 'hono'
import { createProject, getProjects } from '../db/queries'
import { getDb } from '../db'

export const projectRoutes = new Hono()

projectRoutes.get('/', (c) => {
  return c.json(getProjects())
})

projectRoutes.post('/', async (c) => {
  const { name, path } = await c.req.json<{ name: string; path: string }>()
  if (!name || !path) return c.json({ error: 'name and path required' }, 400)
  const id = createProject(name, path)
  return c.json({ id }, 201)
})

projectRoutes.delete('/:id', (c) => {
  const id = c.req.param('id')
  const db = getDb()
  const project = db.prepare('SELECT id FROM projects WHERE id = ?').get(id)
  if (!project) return c.json({ error: 'not found' }, 404)

  db.transaction(() => {
    db.prepare('DELETE FROM messages WHERE task_id IN (SELECT id FROM tasks WHERE project_id = ?)').run(id)
    db.prepare('DELETE FROM tasks WHERE project_id = ?').run(id)
    db.prepare('DELETE FROM projects WHERE id = ?').run(id)
  })()

  return c.body(null, 204)
})
