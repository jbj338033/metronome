import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router'
import { Activity, Rocket } from 'lucide-react'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { useProjectStore } from '@/entities/project/model/store'
import { Button } from '@/shared/ui/button'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { SectionHeader } from '@/shared/ui/section-header'
import { ResourceBar } from '@/features/resource-bar/ui'
import { RunCard } from '@/features/run-card/ui'
import type { ModelStat } from '@/features/resource-bar/ui'
import type { PipelineRun } from '@metronome/types'

export function LivePage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [stats, setStats] = useState<ModelStat[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { runId } = useParams()
  const activeProjectId = useProjectStore((s) => s.activeProjectId)

  const fetchData = useCallback(() => {
    api.pipelines.listRuns(activeProjectId || undefined).then(setRuns)
    api.agents.stats().then((r) => setStats(r.stats))
  }, [activeProjectId])

  useEffect(() => {
    fetchData()

    wsClient.subscribe(['system'])
    const unsub = wsClient.onMessage((msg) => {
      if (msg.event === 'status' && msg.topic.startsWith('pipeline:')) {
        fetchData()
      }
    })

    const interval = setInterval(fetchData, 15000)
    return () => { clearInterval(interval); unsub() }
  }, [fetchData])

  useEffect(() => {
    if (runId) setExpandedId(runId)
  }, [runId])

  useEffect(() => {
    for (const run of runs) {
      if (run.status === 'running' || run.status === 'awaiting_approval' || run.status === 'replanning') {
        wsClient.subscribe([`pipeline:${run.id}`])
      }
    }
  }, [runs])

  const activeRuns = runs.filter((r) => r.status === 'running' || r.status === 'awaiting_approval' || r.status === 'replanning')
  const recentRuns = runs.filter((r) => r.status !== 'running' && r.status !== 'awaiting_approval' && r.status !== 'replanning').slice(0, 10)

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Live">
        <Button asChild variant="secondary" size="sm">
          <Link to="/launch">+ new</Link>
        </Button>
      </PageHeader>

      <ResourceBar stats={stats} />

      {activeRuns.length === 0 && recentRuns.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="no active runs"
          description="launch a pipeline to get started"
        >
          <Button asChild size="sm">
            <Link to="/launch">
              <Rocket size={14} />
              launch
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="flex-1 overflow-auto">
          {activeRuns.length > 0 && (
            <>
              <SectionHeader count={activeRuns.length} indicator="active">active</SectionHeader>
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
              <SectionHeader>recent</SectionHeader>
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
