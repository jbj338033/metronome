import type { PipelineStep, StepStatus } from '@metronome/types'

interface StepState {
  stepId: string
  status: StepStatus
  structured?: unknown
}

export class DagScheduler {
  private steps: PipelineStep[]

  constructor(steps: PipelineStep[]) {
    this.steps = steps
    this.validateDag()
  }

  private validateDag() {
    const ids = new Set(this.steps.map((s) => s.id))

    for (const step of this.steps) {
      for (const dep of step.depends_on || []) {
        if (!ids.has(dep)) {
          throw new Error(`step "${step.id}" depends on unknown step "${dep}"`)
        }
      }
    }

    // 순환 검증 (DFS)
    const visited = new Set<string>()
    const inStack = new Set<string>()

    const dfs = (id: string) => {
      if (inStack.has(id)) throw new Error(`circular dependency detected at step "${id}"`)
      if (visited.has(id)) return
      inStack.add(id)
      const step = this.steps.find((s) => s.id === id)!
      for (const dep of step.depends_on || []) {
        dfs(dep)
      }
      inStack.delete(id)
      visited.add(id)
    }

    for (const step of this.steps) {
      dfs(step.id)
    }
  }

  getReadySteps(states: Map<string, StepState>): PipelineStep[] {
    const ready: PipelineStep[] = []

    for (const step of this.steps) {
      const state = states.get(step.id)
      if (state && state.status !== 'pending') continue

      const deps = step.depends_on || []
      if (deps.length === 0) {
        ready.push(step)
        continue
      }

      const allDepsResolved = deps.every((depId) => {
        const depState = states.get(depId)
        return depState && (depState.status === 'completed' || depState.status === 'skipped')
      })

      if (allDepsResolved) {
        ready.push(step)
      }
    }

    return ready
  }

  getInitialSteps(): PipelineStep[] {
    return this.steps.filter((s) => !s.depends_on || s.depends_on.length === 0)
  }

  getStep(id: string): PipelineStep | undefined {
    return this.steps.find((s) => s.id === id)
  }

  getDependents(stepId: string): PipelineStep[] {
    return this.steps.filter((s) => s.depends_on?.includes(stepId))
  }

  getAllStepIds(): string[] {
    return this.steps.map((s) => s.id)
  }

  rebuild(newSteps: PipelineStep[]) {
    this.steps = newSteps
    this.validateDag()
  }
}
