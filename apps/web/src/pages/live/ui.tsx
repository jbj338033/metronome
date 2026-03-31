import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router'
import { Activity, Rocket } from 'lucide-react'
import { api } from '@/shared/api/client'
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
