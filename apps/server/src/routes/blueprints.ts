import { Hono } from 'hono'

export const blueprintRoutes = new Hono()

blueprintRoutes.get('/', (c) => {
  return c.json([])
})
