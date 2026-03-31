export const schema = `
CREATE TABLE IF NOT EXISTS agent_types (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  command     TEXT NOT NULL,
  default_args TEXT NOT NULL DEFAULT '[]',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agents (
  id          TEXT PRIMARY KEY,
  type_id     TEXT NOT NULL REFERENCES agent_types(id),
  blueprint   TEXT,
  session_id  TEXT,
  pid         INTEGER,
  status      TEXT NOT NULL DEFAULT 'idle',
  model       TEXT,
  cwd         TEXT,
  tokens_in   INTEGER DEFAULT 0,
  tokens_out  INTEGER DEFAULT 0,
  started_at  TEXT,
  ended_at    TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS projects (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  path        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tasks (
  id          TEXT PRIMARY KEY,
  project_id  TEXT REFERENCES projects(id),
  parent_id   TEXT REFERENCES tasks(id),
  title       TEXT NOT NULL,
  description TEXT,
  status      TEXT NOT NULL DEFAULT 'pending',
  agent_id    TEXT REFERENCES agents(id),
  priority    INTEGER NOT NULL DEFAULT 0,
  tags        TEXT DEFAULT '[]',
  result      TEXT,
  total_tokens INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS messages (
  id          TEXT PRIMARY KEY,
  task_id     TEXT REFERENCES tasks(id),
  role        TEXT NOT NULL,
  content     TEXT NOT NULL,
  agent_id    TEXT REFERENCES agents(id),
  metadata    TEXT DEFAULT '{}',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS agent_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id    TEXT NOT NULL REFERENCES agents(id),
  task_id     TEXT REFERENCES tasks(id),
  stream      TEXT NOT NULL DEFAULT 'stdout',
  content     TEXT NOT NULL,
  parsed_type TEXT,
  timestamp   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pipeline_runs (
  id          TEXT PRIMARY KEY,
  pipeline_id TEXT NOT NULL,
  project_id  TEXT REFERENCES projects(id),
  status      TEXT NOT NULL DEFAULT 'running',
  input       TEXT NOT NULL,
  replan_count INTEGER DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at    TEXT
);

CREATE TABLE IF NOT EXISTS step_runs (
  id          TEXT PRIMARY KEY,
  run_id      TEXT NOT NULL REFERENCES pipeline_runs(id),
  step_id     TEXT NOT NULL,
  fan_index   INTEGER,
  status      TEXT NOT NULL DEFAULT 'pending',
  agent_id    TEXT REFERENCES agents(id),
  input       TEXT,
  output      TEXT,
  artifacts   TEXT DEFAULT '[]',
  structured  TEXT,
  started_at  TEXT,
  ended_at    TEXT,
  verify_attempt INTEGER,
  parent_step_run_id TEXT REFERENCES step_runs(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);
CREATE INDEX IF NOT EXISTS idx_messages_task ON messages(task_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_step_runs_run ON step_runs(run_id);

CREATE TABLE IF NOT EXISTS file_changes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT NOT NULL REFERENCES pipeline_runs(id),
  step_id     TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  change_type TEXT NOT NULL DEFAULT 'modified',
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_file_changes_run ON file_changes(run_id);

CREATE TABLE IF NOT EXISTS run_learnings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id      TEXT NOT NULL REFERENCES pipeline_runs(id),
  category    TEXT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
`
