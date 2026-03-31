import { spawn, type ChildProcess } from 'child_process'
import { v4 as uuid } from 'uuid'
import { getDb } from '../db'
import { getAdapter } from './registry'
import { broadcast } from '../ws'
import { events } from '../events'
import type { AgentSpawnOptions } from './adapter'

const MAX_BUFFER = 1_000_000

interface RunningAgent {
  proc: ChildProcess
  adapterId: string
  taskId: string | null
  agentId: string
  lineBuf: string
  output: string
  timeout: ReturnType<typeof setTimeout> | null
}

class AgentManagerImpl {
  private processes = new Map<string, RunningAgent>()

  spawn(opts: {
    typeId: string
    prompt: string
    cwd: string
    model?: string
    blueprint?: string
    sessionId?: string
    resume?: boolean
    taskId?: string
    timeout?: number
    systemPrompt?: string
  }): string {
    const adapter = getAdapter(opts.typeId)
    if (!adapter) throw new Error(`unknown agent type: ${opts.typeId}`)

    const agentId = uuid()
    const spawnOpts: AgentSpawnOptions = {
      prompt: opts.prompt,
      model: opts.model,
      sessionId: opts.sessionId || uuid(),
      resume: opts.resume,
      cwd: opts.cwd,
      timeout: opts.timeout || 300_000,
      systemPrompt: opts.systemPrompt,
    }

    const { cmd, args, env } = adapter.buildCommand(spawnOpts)

    const db = getDb()
    db.prepare(`
      INSERT INTO agents (id, type_id, blueprint, session_id, status, model, cwd, started_at)
      VALUES (?, ?, ?, ?, 'running', ?, ?, datetime('now'))
    `).run(agentId, opts.typeId, opts.blueprint || null, spawnOpts.sessionId, opts.model || null, opts.cwd)

    if (opts.taskId) {
      db.prepare('UPDATE tasks SET status = ?, agent_id = ?, updated_at = datetime(\'now\') WHERE id = ?')
        .run('in_progress', agentId, opts.taskId)
    }

    const proc = spawn(cmd, args, {
      cwd: opts.cwd,
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const running: RunningAgent = {
      proc,
      adapterId: opts.typeId,
      taskId: opts.taskId || null,
      agentId,
      lineBuf: '',
      output: '',
      timeout: null,
    }

    if (spawnOpts.timeout) {
      running.timeout = setTimeout(() => {
        this.kill(agentId, 'timeout')
      }, spawnOpts.timeout)
    }

    this.processes.set(agentId, running)

    const processLine = (line: string) => {
      const events = adapter.parseOutput(line)
      for (const event of events) {
        if (event.type === 'text' || event.type === 'done') {
          running.output += event.content + '\n'
          if (running.output.length > MAX_BUFFER) {
            running.output = running.output.slice(-MAX_BUFFER / 2)
          }
        }

        db.prepare(`
          INSERT INTO agent_logs (agent_id, task_id, stream, content, parsed_type)
          VALUES (?, ?, 'stdout', ?, ?)
        `).run(agentId, running.taskId, event.content, event.type)

        broadcast(`agent:${agentId}`, 'output', {
          ...event,
          agentId,
          taskId: running.taskId,
        })

        if (event.type === 'done' && event.metadata) {
          const tokensIn = (event.metadata.tokens_in as number) || 0
          const tokensOut = (event.metadata.tokens_out as number) || 0
          db.prepare('UPDATE agents SET tokens_in = tokens_in + ?, tokens_out = tokens_out + ? WHERE id = ?')
            .run(tokensIn, tokensOut, agentId)

          if (running.taskId) {
            db.prepare('UPDATE tasks SET total_tokens = total_tokens + ? WHERE id = ?')
              .run(tokensIn + tokensOut, running.taskId)
          }

          if (event.metadata.session_id) {
            db.prepare('UPDATE agents SET session_id = ? WHERE id = ?')
              .run(event.metadata.session_id as string, agentId)
          }
        }
      }
    }

    proc.stdout?.on('data', (data: Buffer) => {
      running.lineBuf += data.toString()
      const lines = running.lineBuf.split('\n')
      running.lineBuf = lines.pop() || ''
      for (const line of lines) {
        if (line.trim()) processLine(line)
      }
    })

    proc.stderr?.on('data', (data: Buffer) => {
      const content = data.toString()
      db.prepare(`
        INSERT INTO agent_logs (agent_id, task_id, stream, content, parsed_type)
        VALUES (?, ?, 'stderr', ?, 'error')
      `).run(agentId, running.taskId, content)

      broadcast(`agent:${agentId}`, 'output', {
        type: 'error',
        content,
        agentId,
        taskId: running.taskId,
        timestamp: Date.now(),
      })
    })

    proc.on('exit', (code) => {
      if (running.timeout) clearTimeout(running.timeout)
      if (running.lineBuf.trim()) processLine(running.lineBuf)

      const status = code === 0 ? 'completed' : 'failed'
      db.prepare('UPDATE agents SET status = ?, pid = NULL, ended_at = datetime(\'now\') WHERE id = ?')
        .run(status, agentId)

      if (running.taskId) {
        const taskStatus = code === 0 ? 'completed' : 'failed'
        db.prepare('UPDATE tasks SET status = ?, updated_at = datetime(\'now\') WHERE id = ?')
          .run(taskStatus, running.taskId)

        broadcast(`task:${running.taskId}`, 'updated', {
          taskId: running.taskId,
          status: taskStatus,
        })
      }

      broadcast(`agent:${agentId}`, 'status', {
        agentId,
        status,
        exitCode: code,
        taskId: running.taskId,
      })

      if (code === 0) {
        events.emit('agent:completed', agentId, code)
      } else {
        events.emit('agent:failed', agentId, code)
      }

      this.processes.delete(agentId)
    })

    if (proc.pid) {
      db.prepare('UPDATE agents SET pid = ? WHERE id = ?').run(proc.pid, agentId)
    }

    broadcast(`agent:${agentId}`, 'status', {
      agentId,
      status: 'running',
      pid: proc.pid,
      taskId: running.taskId,
    })

    return agentId
  }

  kill(agentId: string, reason: string = 'user') {
    const running = this.processes.get(agentId)
    if (!running) return

    if (running.timeout) clearTimeout(running.timeout)
    running.proc.kill('SIGTERM')

    setTimeout(() => {
      if (running.proc.killed) return
      running.proc.kill('SIGKILL')
    }, 30_000)

    const db = getDb()
    db.prepare('UPDATE agents SET status = \'killed\', ended_at = datetime(\'now\') WHERE id = ?')
      .run(agentId)

    if (running.taskId) {
      db.prepare('UPDATE tasks SET status = \'cancelled\', updated_at = datetime(\'now\') WHERE id = ?')
        .run(running.taskId)
    }

    broadcast(`agent:${agentId}`, 'status', {
      agentId,
      status: 'killed',
      reason,
      taskId: running.taskId,
    })

    this.processes.delete(agentId)
  }

  sendInput(agentId: string, content: string) {
    const running = this.processes.get(agentId)
    if (!running || !running.proc.stdin) return false
    running.proc.stdin.write(content + '\n')
    return true
  }

  getRunning() {
    return [...this.processes.entries()].map(([id, r]) => ({
      agentId: id,
      adapterId: r.adapterId,
      taskId: r.taskId,
      pid: r.proc.pid,
    }))
  }

  isRunning(agentId: string) {
    return this.processes.has(agentId)
  }

  getOutput(agentId: string) {
    return this.processes.get(agentId)?.output || ''
  }

  resume(previousAgentId: string, prompt: string): string {
    const db = getDb()
    const agent = db.prepare(
      'SELECT type_id, session_id, cwd, model, blueprint FROM agents WHERE id = ?',
    ).get(previousAgentId) as { type_id: string; session_id: string | null; cwd: string; model: string; blueprint: string } | undefined

    if (!agent?.session_id) throw new Error('no session to resume')

    return this.spawn({
      typeId: agent.type_id,
      prompt,
      cwd: agent.cwd,
      model: agent.model,
      blueprint: agent.blueprint,
      sessionId: agent.session_id,
      resume: true,
      timeout: 300_000,
    })
  }

  recover() {
    const db = getDb()
    const orphans = db.prepare("SELECT id FROM agents WHERE status = 'running'").all() as { id: string }[]
    for (const { id } of orphans) {
      db.prepare("UPDATE agents SET status = 'interrupted', ended_at = datetime('now') WHERE id = ?").run(id)
    }

    const orphanTasks = db.prepare("SELECT id FROM tasks WHERE status = 'in_progress'").all() as { id: string }[]
    for (const { id } of orphanTasks) {
      db.prepare("UPDATE tasks SET status = 'interrupted', updated_at = datetime('now') WHERE id = ?").run(id)
    }

    if (orphans.length > 0) {
      console.log(`recovered ${orphans.length} orphaned agents`)
    }
  }
}

const key = Symbol.for('metronome.agent_manager')
const g = globalThis as unknown as Record<symbol, AgentManagerImpl>
g[key] = new AgentManagerImpl()

export const agentManager: AgentManagerImpl = g[key]
