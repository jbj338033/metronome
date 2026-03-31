import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { schema } from './schema'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const DATA_DIR = path.join(ROOT, 'data')
const DB_PATH = path.join(DATA_DIR, 'metronome.db')

let db: Database.Database

export function getDb() {
  if (!db) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    db = new Database(DB_PATH)
    db.pragma('journal_mode = WAL')
    db.pragma('foreign_keys = ON')
  }
  return db
}

function migrate(d: Database.Database) {
  const cols = d.prepare("PRAGMA table_info(step_runs)").all() as Array<{ name: string }>
  const colNames = new Set(cols.map((c) => c.name))
  if (!colNames.has('verify_attempt')) {
    d.prepare('ALTER TABLE step_runs ADD COLUMN verify_attempt INTEGER').run()
  }
  if (!colNames.has('parent_step_run_id')) {
    d.prepare('ALTER TABLE step_runs ADD COLUMN parent_step_run_id TEXT').run()
  }

  const runCols = d.prepare("PRAGMA table_info(pipeline_runs)").all() as Array<{ name: string }>
  const runColNames = new Set(runCols.map((c) => c.name))
  if (!runColNames.has('error')) {
    d.prepare('ALTER TABLE pipeline_runs ADD COLUMN error TEXT').run()
  }
}

export function initDb() {
  const d = getDb()
  d.exec(schema)
  migrate(d)

  const count = d.prepare('SELECT count(*) as c FROM agent_types').get() as { c: number }
  if (count.c === 0) {
    const insert = d.prepare('INSERT INTO agent_types (id, name, command, default_args) VALUES (?, ?, ?, ?)')
    insert.run('claude-code', 'Claude Code', 'claude', JSON.stringify(['--print', '--output-format', 'stream-json']))
    insert.run('codex', 'Codex', 'codex', JSON.stringify(['exec', '-q', '--approval-mode', 'full-auto']))
    insert.run('gemini', 'Gemini', 'gemini', JSON.stringify(['-p']))
  }
}
