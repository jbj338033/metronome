<h1 align="center">
  <code>metronome</code>
</h1>

<p align="center">
  <strong>orchestrate CLI agents from a single interface</strong>
</p>

---

You run Claude Code in one terminal, Codex in another, Gemini in a third. You lose track. Context fragments. Tokens vanish.

Metronome is a control tower — spawn agents, watch them work, chain them into pipelines, track everything from one screen.

## Getting started

```sh
git clone https://github.com/jbj338033/metronome.git
cd metronome
pnpm install
pnpm dev
```

Open [localhost:5173](http://localhost:5173). Requires Node.js 22+, pnpm 9+, and at least one CLI agent installed.

```sh
# or with docker
docker compose up --build
```

## Features

- **Agent control** — spawn, monitor, kill CLI agents from a web dashboard with real-time output streaming
- **Chat → task** — type a message, a task is created, an agent starts working
- **Pipelines** — multi-step YAML workflows with fan-out, conditions, retry, approval gates
- **Blueprints** — reusable agent roles as YAML — coder, reviewer, planner, verifier
- **Token tracking** — per-agent, per-task usage

## How it works

Define agent roles as **blueprints**:

```yaml
name: coder
agent: claude-code
model: sonnet
timeout: 600
system: |
  코드를 작성하고 테스트까지 돌려.
```

Chain them into **pipelines**:

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

## License

MIT
