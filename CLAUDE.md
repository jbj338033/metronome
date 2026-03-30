# Metronome

AI agent control tower. Hono server + React SPA monorepo.

## Commands

```sh
pnpm dev              # server (3000) + web (5173) concurrently
pnpm build            # build all packages
pnpm start            # production server only
pnpm -F @metronome/server dev   # server only
pnpm -F @metronome/web dev      # web only
```

## Structure

- `apps/server/` — Hono. SQLite (WAL mode), WebSocket, agent subprocess management
- `apps/web/` — Vite + React 19. FSD layers: shared → entities → features → widgets → pages → app
- `packages/types/` — shared types (`@metronome/types`). no build step, import directly
- `blueprints/` — agent role YAML (source of truth, not DB)
- `pipelines/` — workflow YAML (source of truth, not DB)
- `data/` — SQLite database. gitignored. auto-created on first run

## Code style

- TypeScript strict. no `as` assertions — find the correct type
- error messages: lowercase, no period
- no unnecessary abstractions, comments, or wrappers
- `pnpm` only (never npm or yarn)

## Server conventions

- `better-sqlite3` directly. no ORM. typed queries in `db/queries.ts`
- `globalThis` singletons for `AgentManager` and `PipelineEngine` (survive HMR)
- REST for commands, WebSocket for streaming. never mix
- agent adapters implement `AgentAdapter` interface in `agents/adapter.ts`
- pipeline engine split: scheduler, runner, condition, parser, engine

## Web conventions

- FSD: never import upward (entities cannot import features, features cannot import widgets)
- zustand for all state. WebSocket events dispatch directly to store
- shadcn/ui primitives in `shared/ui/`. Geist Sans body, Geist Mono for code/numbers
- dark mode only. zinc base. status colors: emerald (running), red (failed), yellow (pending/warning)
- `cn()` from `shared/lib/cn.ts` for class merging

## Git

- commits: `type: description` (english, lowercase, no period, no co-authored-by)
- one purpose = one commit. split aggressively
- types: feat, fix, chore, refactor, docs, test

## Adding an agent adapter

1. `apps/server/src/agents/adapters/<name>.ts` — implement `AgentAdapter`
2. `apps/server/src/agents/registry.ts` — register
3. `apps/server/src/db/index.ts` — add seed in `initDb`

## Things that will bite you

- claude `--print` requires `--verbose` when using `--output-format stream-json`
- claude needs `--dangerously-skip-permissions` to write files in `--print` mode
- agent stdin is `ignore` (prompt via args). `sendInput` won't work with current config
- `apps/server` runs from its own cwd — DB path resolves relative to project root via `import.meta.url`
- vite dev proxies `/api` and `/ws` to server (port 3000). in production, server serves static files directly
