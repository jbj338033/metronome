import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, MessageCircle, Send } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/shared/api/client'
import { wsClient } from '@/shared/api/ws'
import { cn } from '@/shared/lib/cn'
import { StatusIcon, pipelineStatusMap } from '@/shared/lib/status'
import { Badge } from '@/shared/ui/badge'
import { Button } from '@/shared/ui/button'
import { Input } from '@/shared/ui/input'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/ui/alert-dialog'
import { PipelineTimeline } from '@/widgets/pipeline-timeline/ui'
import { AgentTerminal } from '@/widgets/agent-terminal/ui'
import type { PipelineRun, StepRun } from '@metronome/types'

type StepRunWithModel = StepRun & { agent_model?: string | null }

export function RunCard({ run, isExpanded, onToggle }: {
  run: PipelineRun
  isExpanded: boolean
  onToggle: () => void
}) {
  const [steps, setSteps] = useState<StepRunWithModel[]>([])
  const [activeStep, setActiveStep] = useState<string | null>(null)
  const [interviewQuestions, setInterviewQuestions] = useState<Array<{ id: string; question: string; options?: string[] }>>([])
  const [interviewAnswers, setInterviewAnswers] = useState<Record<string, string>>({})
  const [submittingInterview, setSubmittingInterview] = useState(false)
  const input = JSON.parse(run.input) as { prompt: string; cwd: string }

  const refreshSteps = useCallback(() => {
    api.pipelines.getRunSteps(run.id).then(setSteps)
  }, [run.id])

  useEffect(() => {
    refreshSteps()
    wsClient.subscribe([`pipeline:${run.id}`])
    const unsub = wsClient.onMessage((msg) => {
      if (msg.topic !== `pipeline:${run.id}`) return
      if (msg.event === 'interview') {
        const data = msg.data as { questions: Array<{ id: string; question: string; options?: string[] }> }
        setInterviewQuestions(data.questions)
        setInterviewAnswers({})
      } else {
        refreshSteps()
      }
    })
    return () => { wsClient.unsubscribe([`pipeline:${run.id}`]); unsub() }
  }, [run.id, refreshSteps])

  const completedCount = steps.filter((s) => s.status === 'completed' && !s.step_id.includes('__')).length
  const totalCount = steps.filter((s) => !s.step_id.includes('__')).length
  const activeStepRun = steps.find((s) => s.step_id === activeStep && s.status === 'running')
  const needsApproval = run.status === 'awaiting_approval'
  const isInterviewing = run.status === 'interviewing'

  async function handleCancel() {
    try {
      await api.pipelines.cancelRun(run.id)
      toast.success('pipeline cancelled')
    } catch {
      toast.error('failed to cancel pipeline')
    }
  }

  async function handleApprove(stepId: string) {
    try {
      await api.pipelines.approveStep(run.id, stepId)
    } catch {
      toast.error('failed to approve step')
    }
  }

  async function handleReject(stepId: string) {
    try {
      await api.pipelines.rejectStep(run.id, stepId)
    } catch {
      toast.error('failed to reject step')
    }
  }

  async function handleSubmitInterview() {
    const answers = interviewQuestions.map((q) => ({
      question: q.question,
      answer: interviewAnswers[q.id] || '',
    })).filter((a) => a.answer.trim())

    if (answers.length === 0) return
    setSubmittingInterview(true)
    try {
      await api.pipelines.submitInterview(run.id, answers)
      setInterviewQuestions([])
    } catch {
      toast.error('failed to submit answers')
    } finally {
      setSubmittingInterview(false)
    }
  }

  return (
    <div className={cn(
      'border-b border-border transition-colors',
      (needsApproval || isInterviewing) && 'border-l-2 border-l-yellow-500/50 bg-yellow-950/5',
      isExpanded && 'bg-surface-1',
    )}>
      <button onClick={onToggle} className="flex w-full items-center gap-3 px-6 py-3.5 text-left hover:bg-surface-1 transition-colors">
        <StatusIcon status={pipelineStatusMap[run.status] || 'pending'} className="size-3.5" />
        <div className="flex-1 min-w-0">
          <div className="truncate text-sm font-medium text-foreground">{input.prompt.slice(0, 80)}</div>
          <div className="flex items-center gap-2 mt-1 text-[13px] text-muted-foreground">
            <span className="font-mono text-[11px]">
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
          {isInterviewing && <MessageCircle size={14} className="text-yellow-400" />}
          {needsApproval && <AlertTriangle size={14} className="text-yellow-400" />}
          <Badge variant="secondary" className="gap-1.5 text-[11px]">
            <StatusIcon status={pipelineStatusMap[run.status] || 'pending'} className="size-3" />
            {run.status}
          </Badge>
        </div>
      </button>

      {isExpanded && isInterviewing && interviewQuestions.length > 0 && (
        <div className="border-t border-border p-6 space-y-4">
          <div className="text-sm text-muted-foreground">the orchestrator needs a few more details before creating a plan:</div>
          {interviewQuestions.map((q) => (
            <div key={q.id} className="space-y-2">
              <label className="text-sm font-medium text-foreground">{q.question}</label>
              {q.options ? (
                <div className="flex flex-wrap gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setInterviewAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-xs transition-colors',
                        interviewAnswers[q.id] === opt
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50',
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              ) : (
                <Input
                  value={interviewAnswers[q.id] || ''}
                  onChange={(e) => setInterviewAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                  placeholder="your answer..."
                  className="h-8 text-sm"
                />
              )}
            </div>
          ))}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSubmitInterview}
              disabled={submittingInterview || Object.values(interviewAnswers).every((v) => !v.trim())}
              size="sm"
            >
              <Send size={14} />
              submit answers
            </Button>
            <Button onClick={handleCancel} variant="ghost" size="sm" className="text-muted-foreground">
              cancel
            </Button>
          </div>
        </div>
      )}

      {isExpanded && !isInterviewing && (
        <div className="flex min-h-[400px] max-h-[500px] border-t border-border">
          <div className="w-80 shrink-0 overflow-auto border-r border-border">
            <PipelineTimeline steps={steps} onStepClick={setActiveStep} activeStepId={activeStep} />

            {needsApproval && steps.filter((s) => s.status === 'pending').map((s) => (
              <div key={s.step_id} className="px-4 py-2 flex gap-1">
                <Button onClick={() => handleApprove(s.step_id)} variant="secondary" size="sm" className="flex-1 text-emerald-400">approve</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" size="sm" className="flex-1 text-red-400">reject</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>reject step?</AlertDialogTitle>
                      <AlertDialogDescription>this will cancel the pipeline run</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleReject(s.step_id)}>reject</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}

            {run.status === 'running' && (
              <div className="p-4 border-t border-border flex gap-1">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="flex-1">cancel</Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>cancel pipeline?</AlertDialogTitle>
                      <AlertDialogDescription>all running agents will be killed</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>keep running</AlertDialogCancel>
                      <AlertDialogAction onClick={handleCancel}>cancel pipeline</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
                <Button onClick={() => api.pipelines.requestReplan(run.id).catch(() => toast.error('replan failed'))} variant="secondary" size="sm" className="flex-1">replan</Button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-auto">
            {activeStepRun?.agent_id ? (
              <AgentTerminal agentId={activeStepRun.agent_id} />
            ) : activeStep ? (
              <div className="space-y-2 p-4">
                {steps.filter((s) => s.step_id === activeStep).map((s, i) => (
                  <div key={i} className="rounded-md border border-border bg-surface-2 p-3">
                    <div className="text-xs text-muted-foreground mb-1">{s.step_id} — {s.status}</div>
                    {s.output && (
                      <pre className="mt-2 max-h-72 overflow-auto rounded bg-surface-0 p-2 font-mono text-xs text-foreground/70">
                        {s.output.slice(0, 3000)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-[13px] text-muted-foreground">
                select a step to view details
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
