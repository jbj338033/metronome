import { v4 as uuid } from 'uuid'
import { getDb } from './index'

export function createMessage(opts: {
  taskId?: string
  role: string
  content: string
  agentId?: string
  metadata?: Record<string, unknown>
}) {
  const id = uuid()
  getDb().prepare(`
    INSERT INTO messages (id, task_id, role, content, agent_id, metadata)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, opts.taskId || null, opts.role, opts.content, opts.agentId || null, JSON.stringify(opts.metadata || {}))
  return id
}

export function createTask(opts: {
  title: string
  description?: string
  projectId?: string
  parentId?: string
  priority?: number
  tags?: string[]
}) {
  const id = uuid()
  getDb().prepare(`
    INSERT INTO tasks (id, project_id, parent_id, title, description, priority, tags)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, opts.projectId || null, opts.parentId || null, opts.title, opts.description || null, opts.priority || 0, JSON.stringify(opts.tags || []))
  return id
}

export function getTasksByProject(projectId?: string) {
  if (projectId) {
    return getDb().prepare('SELECT * FROM tasks WHERE project_id = ? ORDER BY created_at DESC').all(projectId)
  }
  return getDb().prepare('SELECT * FROM tasks ORDER BY created_at DESC').all()
}

export function getTaskById(id: string) {
  return getDb().prepare('SELECT * FROM tasks WHERE id = ?').get(id)
}

export function getSubtasks(parentId: string) {
  return getDb().prepare('SELECT * FROM tasks WHERE parent_id = ? ORDER BY created_at ASC').all(parentId)
}

export function updateTask(id: string, fields: Record<string, unknown>) {
  const sets: string[] = []
  const values: unknown[] = []
  for (const [key, value] of Object.entries(fields)) {
    sets.push(`${key} = ?`)
    values.push(value)
  }
  sets.push("updated_at = datetime('now')")
  values.push(id)
  getDb().prepare(`UPDATE tasks SET ${sets.join(', ')} WHERE id = ?`).run(...values)
}

export function getMessagesByTask(taskId: string) {
  return getDb().prepare('SELECT * FROM messages WHERE task_id = ? ORDER BY created_at ASC').all(taskId)
}

export function createProject(name: string, path: string) {
  const id = uuid()
  getDb().prepare('INSERT INTO projects (id, name, path) VALUES (?, ?, ?)').run(id, name, path)
  return id
}

export function getProjects() {
  return getDb().prepare('SELECT * FROM projects ORDER BY created_at DESC').all()
}
