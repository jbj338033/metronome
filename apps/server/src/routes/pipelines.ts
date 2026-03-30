import { Hono } from 'hono'

export const pipelineRoutes = new Hono()

pipelineRoutes.get('/', (c) => {
  return c.json([])
})
