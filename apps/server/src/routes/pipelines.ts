import { Hono } from 'hono'
import { listPipelines, loadPipeline, savePipeline } from '../pipeline/loader'
import { pipelineEngine } from '../pipeline/engine'
import { getDb } from '../db'

export const pipelineRoutes = new Hono()

pipelineRoutes.get('/', (c) => {
  return c.json(listPipelines())
})

pipelineRoutes.post('/run-dynamic', async (c) => {
  const body = await c.req.json<{ prompt: string; cwd: string; project_id?: string }>()
  const runId = pipelineEngine.startFromPrompt({
    prompt: body.prompt,
    cwd: body.cwd,
    projectId: body.project_id,
  })
  return c.json({ runId }, 202)
})

pipelineRoutes.get('/runs', (c) => {
  const projectId = c.req.query('project_id')
  if (projectId) {
    return c.json(getDb().prepare('SELECT * FROM pipeline_runs WHERE project_id = ? ORDER BY created_at DESC').all(projectId))
  }
  return c.json(getDb().prepare('SELECT * FROM pipeline_runs ORDER BY created_at DESC').all())
})

pipelineRoutes.get('/runs/:id', (c) => {
  const run = getDb().prepare('SELECT * FROM pipeline_runs WHERE id = ?').get(c.req.param('id'))
  if (!run) return c.json({ error: 'not found' }, 404)
  return c.json(run)
})

pipelineRoutes.get('/runs/:id/files', (c) => {
  const files = getDb().prepare(
    'SELECT * FROM file_changes WHERE run_id = ? ORDER BY created_at',
  ).all(c.req.param('id'))
  return c.json(files)
})

pipelineRoutes.get('/runs/:id/steps', (c) => {
  const steps = getDb().prepare(`
    SELECT sr.*, a.model as agent_model
    FROM step_runs sr
    LEFT JOIN agents a ON sr.agent_id = a.id
    WHERE sr.run_id = ?
    ORDER BY sr.started_at ASC
  `).all(c.req.param('id'))
  return c.json(steps)
})

pipelineRoutes.post('/runs/:id/replan', (c) => {
  pipelineEngine.requestReplan(c.req.param('id'))
  return c.json({ ok: true })
})

pipelineRoutes.post('/runs/:id/cancel', (c) => {
  pipelineEngine.cancel(c.req.param('id'))
  return c.json({ ok: true })
})

pipelineRoutes.post('/runs/:id/approve/:stepId', (c) => {
  pipelineEngine.approve(c.req.param('id'), c.req.param('stepId'))
  return c.json({ ok: true })
})

pipelineRoutes.post('/runs/:id/reject/:stepId', (c) => {
  pipelineEngine.reject(c.req.param('id'), c.req.param('stepId'))
  return c.json({ ok: true })
})

pipelineRoutes.get('/:name', (c) => {
  const pipeline = loadPipeline(c.req.param('name'))
  if (!pipeline) return c.json({ error: 'not found' }, 404)
  return c.json(pipeline)
})

pipelineRoutes.put('/:name', async (c) => {
  const body = await c.req.json()
  body.name = c.req.param('name')
  savePipeline(body)
  return c.json(body)
})

pipelineRoutes.post('/:name/run', async (c) => {
  const name = c.req.param('name')
  const body = await c.req.json<{ prompt: string; cwd: string; project_id?: string }>()
  try {
    const runId = pipelineEngine.start(name, {
      prompt: body.prompt,
      cwd: body.cwd,
      projectId: body.project_id,
    })
    return c.json({ runId }, 202)
  } catch (err) {
    return c.json({ error: (err instanceof Error) ? err.message : 'internal error' }, 400)
  }
})
