import { Hono } from 'hono'
import { getDb } from '../db'
import { agentManager } from '../agents/manager'
import { checkAllAvailability } from '../agents/registry'
import { estimateCost, getModelTiers } from '../agents/model-router'

export const agentRoutes = new Hono()

agentRoutes.get('/', (c) => {
  const agents = getDb().prepare('SELECT * FROM agents ORDER BY created_at DESC').all()
  return c.json(agents)
})

agentRoutes.get('/types', (c) => {
  const types = getDb().prepare('SELECT * FROM agent_types').all()
  return c.json(types)
})

agentRoutes.get('/availability', async (c) => {
  const availability = await checkAllAvailability()
  return c.json(availability)
})

agentRoutes.get('/running', (c) => {
  return c.json(agentManager.getRunning())
})

agentRoutes.get('/stats', (c) => {
  const db = getDb()
  const rows = db.prepare(`
    SELECT model, COUNT(*) as count,
      SUM(tokens_in) as total_in, SUM(tokens_out) as total_out
    FROM agents WHERE status IN ('completed', 'failed')
    GROUP BY model
  `).all() as Array<{ model: string; count: number; total_in: number; total_out: number }>

  const stats = rows.map((r) => ({
    model: r.model || 'unknown',
    count: r.count,
    tokens_in: r.total_in,
    tokens_out: r.total_out,
    estimated_cost: estimateCost(r.model || '', r.total_in, r.total_out),
  }))

  return c.json({ stats, tiers: getModelTiers() })
})

agentRoutes.post('/spawn', async (c) => {
  const body = await c.req.json<{
    type_id: string
    prompt: string
    cwd: string
    model?: string
    blueprint?: string
    session_id?: string
    task_id?: string
    timeout?: number
    system_prompt?: string
  }>()

  try {
    const agentId = agentManager.spawn({
      typeId: body.type_id,
      prompt: body.prompt,
      cwd: body.cwd,
      model: body.model,
      blueprint: body.blueprint,
      sessionId: body.session_id,
      taskId: body.task_id,
      timeout: body.timeout,
      systemPrompt: body.system_prompt,
    })
    return c.json({ agentId }, 201)
  } catch (err) {
    return c.json({ error: (err instanceof Error) ? err.message : 'internal error' }, 400)
  }
})

agentRoutes.get('/:id', (c) => {
  const agent = getDb().prepare('SELECT * FROM agents WHERE id = ?').get(c.req.param('id'))
  if (!agent) return c.json({ error: 'not found' }, 404)
  return c.json(agent)
})

agentRoutes.get('/:id/logs', (c) => {
  const logs = getDb()
    .prepare('SELECT * FROM agent_logs WHERE agent_id = ? ORDER BY id DESC LIMIT 200')
    .all(c.req.param('id'))
  return c.json(logs)
})

agentRoutes.post('/:id/resume', async (c) => {
  const { prompt } = await c.req.json<{ prompt: string }>()
  try {
    const newAgentId = agentManager.resume(c.req.param('id'), prompt)
    return c.json({ agentId: newAgentId }, 201)
  } catch (err) {
    return c.json({ error: (err instanceof Error) ? err.message : 'internal error' }, 400)
  }
})

agentRoutes.delete('/:id', (c) => {
  const agentId = c.req.param('id')
  if (!agentManager.isRunning(agentId)) {
    return c.json({ error: 'agent not running' }, 404)
  }
  agentManager.kill(agentId)
  return c.body(null, 204)
})
