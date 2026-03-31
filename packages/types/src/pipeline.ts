export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped' | 'cancelled' | 'retrying' | 'awaiting_approval'
export type PipelineRunStatus = 'running' | 'completed' | 'failed' | 'cancelled' | 'interrupted' | 'awaiting_approval' | 'replanning' | 'interviewing'
export type MergeStrategy = 'sequential' | 'manual'
export type OnConflict = 'agent' | 'user'
export type OnSkip = 'complete' | 'propagate'

export interface VerifyConfig {
  blueprint: string
  max_fix_attempts: number
  fix_blueprint?: string
  pass_condition: string
  include_in_fix: ('issues' | 'output' | 'artifacts')[]
}

export interface PipelineStep {
  id: string
  blueprint: string
  agent?: string
  model?: string
  prompt?: string
  depends_on?: string[]
  fan_out?: string
  merge?: 'all' | 'any'
  max_concurrency?: number
  merge_strategy?: MergeStrategy
  on_conflict?: OnConflict
  timeout?: number
  retry?: { max: number; backoff?: 'exponential' | 'linear' }
  condition?: string
  on_skip?: OnSkip
  approval?: boolean
  context?: Array<{ step: string; include: string[] }>
  verify?: VerifyConfig
  verify_command?: string
}

export interface Pipeline {
  name: string
  max_replan?: number
  timeout?: number
  steps: PipelineStep[]
}

export interface PipelineRun {
  id: string
  pipeline_id: string
  project_id: string | null
  status: PipelineRunStatus
  input: string
  error: string | null
  replan_count: number
  created_at: string
  ended_at: string | null
}

export interface StepRun {
  id: string
  run_id: string
  step_id: string
  fan_index: number | null
  status: StepStatus
  agent_id: string | null
  agent_model?: string | null
  input: string | null
  output: string | null
  artifacts: string
  structured: string | null
  started_at: string | null
  ended_at: string | null
  verify_attempt: number | null
  parent_step_run_id: string | null
}

export interface PipelineRunRequest {
  prompt: string
  cwd: string
  project_id?: string
}

export interface FileChange {
  id: number
  run_id: string
  step_id: string
  file_path: string
  change_type: string
  created_at: string
}
