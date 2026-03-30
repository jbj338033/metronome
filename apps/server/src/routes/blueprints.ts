import { Hono } from 'hono'
import { listBlueprints, loadBlueprint, saveBlueprint, deleteBlueprint } from '../pipeline/loader'

export const blueprintRoutes = new Hono()

blueprintRoutes.get('/', (c) => {
  return c.json(listBlueprints())
})

blueprintRoutes.get('/:name', (c) => {
  const bp = loadBlueprint(c.req.param('name'))
  if (!bp) return c.json({ error: 'not found' }, 404)
  return c.json(bp)
})

blueprintRoutes.put('/:name', async (c) => {
  const body = await c.req.json()
  body.name = c.req.param('name')
  saveBlueprint(body)
  return c.json(body)
})

blueprintRoutes.delete('/:name', (c) => {
  const deleted = deleteBlueprint(c.req.param('name'))
  if (!deleted) return c.json({ error: 'not found' }, 404)
  return c.body(null, 204)
})
