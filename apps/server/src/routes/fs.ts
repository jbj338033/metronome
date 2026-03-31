import { Hono } from 'hono'
import fs from 'fs'
import path from 'path'

export const fsRoutes = new Hono()

fsRoutes.get('/list', (c) => {
  const raw = c.req.query('path') || '/'
  const resolved = path.resolve(raw)

  if (!fs.existsSync(resolved)) {
    return c.json({ error: 'path not found' }, 404)
  }

  const stat = fs.statSync(resolved)
  if (!stat.isDirectory()) {
    return c.json({ error: 'not a directory' }, 400)
  }

  const showHidden = c.req.query('hidden') === 'true'

  const rawEntries = fs.readdirSync(resolved, { withFileTypes: true })
  const entries = rawEntries
    .filter((e) => showHidden || !e.name.startsWith('.'))
    .filter((e) => e.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ name: e.name, type: 'directory' as const }))

  const parent = path.dirname(resolved)

  return c.json({
    path: resolved,
    parent: parent !== resolved ? parent : null,
    entries,
  })
})
