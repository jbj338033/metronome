import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { Activity, AlertTriangle, Rocket } from 'lucide-react'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { useAgentStore } from '@/entities/agent/model/store'
import { cn } from '@/shared/lib/cn'
import { StatusIcon } from '@/shared/lib/status'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Skeleton } from '@/shared/ui/skeleton'
import { PipelineTimeline } from '@/widgets/pipeline-timeline/ui'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import type { PipelineRun, StepRun } from '@metronome/types'

type StepRunWithModel = StepRun & { agent_model?: string | null }

const statusMap: Record<string, string> = {
  running: 'in_progress',
  completed: 'completed',
  failed: 'failed',
  cancelled: 'cancelled',
  replanning: 'pending',
  awaiting_approval: 'awaiting_approval',
}

interface ModelStat {
  model: string
  count: number
  tokens_in: number
  tokens_out: number
  estimated_cost: number
}

function ResourceBar({ stats }: { stats: ModelStat[] }) {
  const runningAgents = useAgentStore((s) => s.runningAgents)
  const totalCost = stats.reduce((s, r) => s + r.estimated_cost, 0)
  const totalTokens = stats.reduce((s, r) => s + r.tokens_in + r.tokens_out, 0)

  return (
    <div className="flex items-center gap-5 border-b border-border bg-card/30 px-6 py-2.5 text-xs">
      <div className="flex items-center gap-1.5">
        <span className={cn('size-2 rounded-full', runningAgents.length > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-muted-foreground/30')} />
        <span className={cn(runningAgents.length > 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
          {runningAgents.length} agent{runningAgents.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="h-3 w-px bg-border" />
      {stats.map((s) => (
        <span key={s.model} className="flex items-center gap-1.5 text-muted-foreground">
          <span className={cn(
            'size-2 rounded-full',
            s.model === 'opus' ? 'bg-violet-400' : s.model === 'sonnet' ? 'bg-primary' : 'bg-muted-foreground/40',
          )} />
          <span className="font-medium text-foreground/70">{s.model || '?'}</span>
          <span className="font-mono">{((s.tokens_in + s.tokens_out) / 1000).toFixed(0)}k</span>
        </span>
      ))}
      <div className="ml-auto flex items-center gap-3 text-muted-foreground">
        {totalTokens > 0 && <span className="font-mono">{(totalTokens / 1000).toFixed(0)}k tokens</span>}
        {totalCost > 0 && <span className="font-mono text-foreground/60">${totalCost.toFixed(3)}</span>}
      </div>
    </div>
  )
}

function RunCard({ run, isExpanded, onToggle }: {
  run: PipelineRun
  isExpanded: boolean
  onToggle: () => void
}) {
  const [steps, setSteps] = useState<StepRunWithModel[]>([])
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const input = JSON.parse(run.input) as { prompt: string; cwd: string }

  useEffect(() => {
    api.pipelines.getRunSteps(run.id).then(setSteps)
    wsClient.subscribe([`pipeline:${run.id}`])
    const unsub = wsClient.onMessage((msg) => {
      if (msg.topic === `pipeline:${run.id}`) {
        api.pipelines.getRunSteps(run.id).then(setSteps)
      }
    })
    return () => { wsClient.unsubscribe([`pipeline:${run.id}`]); unsub() }
  }, [run.id])

  const completedCount = steps.filter((s) => s.status === 'completed' && !s.step_id.includes('__')).length
  const totalCount = steps.filter((s) => !s.step_id.includes('__')).length
  const activeStepRun = steps.find((s) => s.step_id === activeStep && s.status === 'running')
  const needsApproval = run.status === 'awaiting_approval'

  return (
    <div className={cn(
      'border-b border-border transition-colors',
      needsApproval && 'border-l-2 border-l-yellow-500/50 bg-yellow-950/5',
      isExpanded && 'bg-card/20',
    )}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-6 py-3.5 text-left hover:bg-accent/20 transition-colors">
        <StatusIcon status={statusMap[run.status] || 'pending'} className="size-4" />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium text-foreground/90">{input.prompt.slice(0, 80)}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <span className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
              {run.pipeline_id === '__orchestrated' ? 'auto' : run.pipeline_id}
            </span>
            {totalCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="font-mono">{completedCount}/{totalCount}</span> steps
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {needsApproval && <AlertTriangle size={14} className="text-yellow-400" />}
          <Badge variant="secondary" className="gap-1.5 text-[11px]">
            <StatusIcon status={statusMap[run.status] || 'pending'} className="size-3" />
            {run.status}
          </Badge>
        </div>
      </button>

      {isExpanded && (
        <div className="flex border-t border-border" style={{ height: 400 }}>
          <div className="w-72 shrink-0 overflow-auto border-r border-border">
            <PipelineTimeline steps={steps} onStepClick={setActiveStep} activeStepId={activeStep} />

            {needsApproval && steps.filter((s) => s.status === 'pending').map((s) => (
              <div key={s.step_id} className="px-4 py-2 flex gap-1">
                <Button onClick={() => api.pipelines.approveStep(run.id, s.step_id)} variant="secondary" size="sm" className="flex-1 text-emerald-400">approve</Button>
                <Button onClick={() => api.pipelines.rejectStep(run.id, s.step_id)} variant="secondary" size="sm" className="flex-1 text-red-400">reject</Button>
              </div>
            ))}

            {run.status === 'running' && (
              <div className="p-4 border-t border-border flex gap-1">
                <Button onClick={() => api.pipelines.cancelRun(run.id)} variant="destructive" size="sm" className="flex-1">cancel</Button>
                <Button onClick={() => api.pipelines.requestReplan(run.id)} variant="secondary" size="sm" className="flex-1">replan</Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {activeStepRun?.agent_id ? (
              <AgentTerminal agentId={activeStepRun.agent_id} />
            ) : activeStep ? (
              <div className="p-4">
                {steps.filter((s) => s.step_id === activeStep).map((s, i) => (
                  <div key={i} className="rounded-md border border-border p-3 mt-2">
                    <div className="text-xs text-muted-foreground mb-1">{s.step_id} — {s.status}</div>
                    {s.output && (
                      <pre className="mt-2 max-h-72 overflow-auto rounded bg-card p-2 font-mono text-xs text-foreground/70">
                        {s.output.slice(0, 3000)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                select a step to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function LivePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [stats, setStats] = useState<ModelStat[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { runId } = useParams()

  useEffect(() => {
    const fetch = () => {
      api.pipelines.listRuns().then(setRuns)
      api.agents.stats().then((r) => setStats(r.stats))
    }
    fetch()
    const interval = setInterval(fetch, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (runId) setExpandedId(runId)
  }, [runId])

  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'awaiting_approval' || r.status === 'replanning')
  const recentRuns = runs.filter((r) => r.status !== 'running' && r.status !== 'awaiting_approval' && r.status !== 'replanning').slice(0, 10)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <h1 className="text-sm font-semibold">Live</h1>
        <Button asChild variant="secondary" size="sm">
          <Link to="/launch">+ new</Link>
        </Button>
      </div>

      <ResourceBar stats={stats} />

      {activeRuns.length === 0 && recentRuns.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <div className="rounded-xl border border-border/50 bg-card/30 p-6">
            <Activity size={28} strokeWidth={1.5} className="mx-auto text-muted-foreground/30" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground/70">no active runs</p>
            <p className="mt-1 text-xs text-muted-foreground">launch a pipeline to get started</p>
          </div>
          <Button asChild size="sm">
            <Link to="/launch">
              <Rocket size={14} />
              launch
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {activeRuns.length > 0 && (
            <>
              <div className="flex items-center gap-2 px-6 py-2.5">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  active ({activeRuns.length})
                </span>
              </div>
              {activeRuns.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  isExpanded={expandedId === run.id}
                  onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
                />
              ))}
            </>
          )}

          {recentRuns.length > 0 && (
            <>
              <div className="px-6 py-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/40">
                  recent
                </span>
              </div>
              {recentRuns.map((run) => (
                <RunCard
                  key={run.id}
                  run={run}
                  isExpanded={expandedId === run.id}
                  onToggle={() => setExpandedId(expandedId === run.id ? null : run.id)}
                />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
