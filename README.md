<h1 align="center">
  <code>metronome</code>
</h1>

<p align="center">
  <strong>orchestrate CLI agents from a single interface</strong>
</p>

---

## Why

You run Claude Code in one terminal, Codex in another, Gemini in a third. You lose track of what each is doing. Context fragments. Tokens vanish.

Metronome is a control tower: spawn agents, watch them work, chain them into pipelines, track everything from one screen.

## Getting started

```sh
git clone https://github.com/jbj338033/metronome.git
cd metronome
pnpm install
pnpm dev
```

Open [localhost:5173](http://localhost:5173).

**Docker:**
```sh
docker compose up --build
```

**Requires:** Node.js 22+, pnpm 9+, at least one CLI agent (`claude`, `codex`, or `gemini`)

## Features

- **Agent control** — spawn, monitor, and kill CLI agents from a web dashboard
- **Chat → task** — type a message, a task is auto-created, an agent starts working
- **Pipelines** — multi-step YAML workflows with fan-out, conditions, retry, approval gates
- **Blueprints** — reusable agent roles (coder, reviewer, planner) as YAML
- **Real-time** — WebSocket streaming of agent output, status, pipeline progress
- **Token tracking** — per-agent and per-task usage
- **Keyboard-first** — `⌘K` command palette, number keys for tabs

## How it works

Define **blueprints** (agent roles):

```yaml
# blueprints/coder.yaml
name: coder
agent: claude-code
model: sonnet
timeout: 600
system: |
  코드를 작성하고 테스트까지 돌려.
```

Chain them into **pipelines**:

```yaml
# pipelines/defaults/standard.yaml
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

Run from the web UI or API. Each step spawns an agent, streams output in real time, passes results to the next step.

## Tech stack

| | |
|---|---|
| Server | [Hono](https://hono.dev) · SQLite · WebSocket |
| Frontend | [Vite](https://vite.dev) · React 19 · [zustand](https://zustand.docs.pmnd.rs) · [@xyflow/react](https://reactflow.dev) |
| UI | [shadcn/ui](https://ui.shadcn.com) · Geist · dark mode |
| Monorepo | pnpm workspace |
| Deploy | Docker multi-stage |

## Contributing

```sh
pnpm dev                          # start everything
pnpm -F @metronome/server dev     # server only
pnpm -F @metronome/web dev        # web only
```

See [CLAUDE.md](./CLAUDE.md) for project conventions.

## License

MIT
