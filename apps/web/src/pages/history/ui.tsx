import { useState, useEffect } from 'react'
import { Link } from 'react-router'
import { Clock } from 'lucide-react'
import { api } from '@/shared/api/client'
import { useTaskStore } from '@/entities/task/model/store'
import { StatusIcon, pipelineStatusMap } from '@/shared/lib/status'
import { formatRelativeTime, formatDuration } from '@/shared/lib/format'
import { PageHeader } from '@/shared/ui/page-header'
import { EmptyState } from '@/shared/ui/empty-state'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs'
import type { PipelineRun } from '@metronome/types'

export function HistoryPage() {
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const tasks = useTaskStore((s) => s.tasks)

  useEffect(() => {
    api.pipelines.listRuns().then(setRuns)
  }, [])

  const completedRuns = runs.filter((r) => r.status !== 'running' && r.status !== 'awaiting_approval')

  return (
    <div className="flex h-full flex-col">
      <Tabs defaultValue="runs" className="flex h-full flex-col gap-0">
        <PageHeader title="History">
          <TabsList className="h-7">
            <TabsTrigger value="runs" className="text-[13px] px-2.5 h-7">pipeline runs</TabsTrigger>
            <TabsTrigger value="tasks" className="text-[13px] px-2.5 h-7">tasks</TabsTrigger>
          </TabsList>
        </PageHeader>

        <TabsContent value="runs" className="flex-1 overflow-auto mt-0">
          {completedRuns.length === 0 ? (
            <EmptyState icon={Clock} title="no runs yet" description="completed pipeline runs will appear here" />
          ) : (
            completedRuns.map((run) => {
              const input = JSON.parse(run.input) as { prompt: string }
              return (
                <Link
                  key={run.id}
                  to={`/live/${run.id}`}
                  className="flex items-center gap-3 border-b border-border px-6 py-3.5 hover:bg-surface-1 transition-colors"
                >
                  <StatusIcon status={pipelineStatusMap[run.status] || 'pending'} className="size-3.5" />
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{input.prompt}</div>
                    <div className="flex gap-2 mt-0.5 text-[13px] text-muted-foreground">
                      <span>{run.pipeline_id === '__orchestrated' ? 'auto' : run.pipeline_id}</span>
                      <span>{formatDuration(run.created_at, run.ended_at)}</span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">{formatRelativeTime(run.created_at)}</span>
                </Link>
              )
            })
          )}
        </TabsContent>

        <TabsContent value="tasks" className="flex-1 overflow-auto mt-0">
          {tasks.length === 0 ? (
            <EmptyState icon={Clock} title="no tasks yet" description="tasks will appear here as they are created" />
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 border-b border-border px-6 py-3.5 hover:bg-surface-1 transition-colors"
              >
                <StatusIcon status={task.status} className="size-3.5" />
                <span className="flex-1 truncate text-sm font-medium text-foreground">{task.title}</span>
                {task.total_tokens > 0 && (
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {(task.total_tokens / 1000).toFixed(1)}k
                  </span>
                )}
                <span className="text-xs text-muted-foreground">{formatRelativeTime(task.created_at)}</span>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
