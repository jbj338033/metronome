<h1 align="center">
  <code>metronome</code>
</h1>

<p align="center">
  <strong>orchestrate CLI agents from a single interface</strong>
</p>

<p align="center">
  <a href="#quickstart">Quickstart</a> ·
  <a href="#features">Features</a> ·
  <a href="#architecture">Architecture</a> ·
  <a href="#blueprints">Blueprints</a> ·
  <a href="#pipelines">Pipelines</a>
</p>

---

## Why

| Without Metronome | With Metronome |
|---|---|
| Terminal 1: Claude Code, Terminal 2: Codex, Terminal 3: Gemini | One dashboard, all agents |
| No idea what each is doing | Real-time output streaming |
| Context scattered across sessions | Tasks, history, tokens — tracked |
| Manual multi-step workflows | Pipelines: plan → implement → verify |
| Can't parallelize work | Fan-out with git worktree isolation |

## Quickstart

```sh
git clone https://github.com/jbj338033/metronome.git
cd metronome
pnpm install
pnpm dev
```

Open [localhost:5173](http://localhost:5173). Requires Node.js 22+, pnpm 9+, and at least one CLI agent (`claude`, `codex`, or `gemini`).

### Docker

```sh
docker compose up --build
```

## Features

**Agent Control** — spawn Claude Code, Codex, Gemini as subprocesses. Watch output in real time. Track tokens per agent and task. Kill or restart anytime.

**Chat → Task** — type a message, a task is auto-created, an agent is spawned. Follow up mid-task to course-correct via stdin.

**Pipelines** — chain agents into multi-step workflows defined in YAML. Fan-out for parallelism, conditional steps, retry with backoff, human approval gates.

**Blueprints** — define agent roles (coder, reviewer, planner) with system prompts, model selection, timeout. Edit from web UI or YAML.

**Projects** — organize tasks and agents by project. Each project maps to a directory on disk.

**Keyboard-first** — `⌘K` command palette, `1`–`5` tab switching, `⌘N` new chat.

## ~is right for you if

- You use multiple AI coding agents and want a unified control point
- You want to automate multi-agent workflows (plan → code → review → fix)
- You care about cost: CLI subscriptions over per-token API billing
- You self-host: Docker + your own domain, no SaaS dependency

## Architecture

```
metronome/
├── apps/
│   ├── server/     Hono · SQLite (WAL) · WebSocket
│   └── web/        Vite · React 19 · FSD · zustand
├── packages/
│   └── types/      @metronome/types
├── blueprints/     agent role YAML
├── pipelines/      workflow YAML
└── data/           SQLite (gitignored)
```

| Component | Tech |
|-----------|------|
| Server | Hono, better-sqlite3, ws |
| Frontend | Vite, React 19, @xyflow/react |
| State | zustand |
| UI | shadcn/ui, Geist Sans/Mono, dark mode |
| Monorepo | pnpm workspace |
| Deploy | Docker multi-stage |

**Communication:** REST for commands (spawn, kill, CRUD). WebSocket for streaming (agent output, status, pipeline steps). Topic-based multiplexing with subscribe/unsubscribe.

## Blueprints

Agent roles in `blueprints/*.yaml`:

```yaml
name: coder
agent: claude-code
model: sonnet
timeout: 600
max_turns: 50
system: |
  코드를 작성하고 테스트까지 돌려.
  변경사항은 최소화하고, 기존 패턴을 따라.
```

| Blueprint | Role | Model |
|-----------|------|-------|
| `coder` | write code, run tests | sonnet |
| `coder-heavy` | complex architecture, large refactors | opus |
| `reviewer` | find bugs, review code (read-only) | sonnet |
| `planner` | decompose tasks into subtasks | sonnet |
| `verifier` | verify implementation, check TODOs | sonnet |

Edit via web UI (Agents → Blueprints tab) or directly in YAML.

## Pipelines

Multi-step workflows in `pipelines/*.yaml`:

```yaml
name: standard
steps:
  - id: plan
    blueprint: planner

  - id: implement
    blueprint: coder
    depends_on: [plan]
    fan_out: "plan.subtasks"
    max_concurrency: 3

  - id: verify
    blueprint: verifier
    depends_on: [implement]
```

| Pipeline | Steps | Use when |
|----------|-------|----------|
| `quick` | execute | Simple, single-agent task |
| `standard` | plan → implement → verify | Feature work |
| `thorough` | plan → implement → review → fix → verify | Critical changes |

### Pipeline features

| Feature | Example | Description |
|---------|---------|-------------|
| `fan_out` | `"plan.subtasks"` | parallel subtasks from previous output |
| `condition` | `"review.has_issues"` | skip step if false |
| `retry` | `{ max: 2, backoff: exponential }` | auto-retry on failure |
| `approval` | `true` | pause for human confirmation |
| `max_concurrency` | `3` | limit parallel agents |
| `on_skip` | `complete` or `propagate` | behavior when skipped |

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/agents` | list agents |
| `POST` | `/api/agents/spawn` | spawn agent |
| `DELETE` | `/api/agents/:id` | kill agent |
| `GET` | `/api/tasks` | list tasks |
| `POST` | `/api/chat` | send message (auto-creates task) |
| `GET` | `/api/blueprints` | list blueprints |
| `PUT` | `/api/blueprints/:name` | save blueprint |
| `GET` | `/api/pipelines` | list pipelines |
| `POST` | `/api/pipelines/:name/run` | run pipeline |
| `POST` | `/api/pipelines/runs/:id/cancel` | cancel run |
| `GET` | `/health` | health check |

**WebSocket:** `ws://host/ws` — subscribe to `agent:<id>`, `task:<id>`, `pipeline:<id>`.

## License

MIT
