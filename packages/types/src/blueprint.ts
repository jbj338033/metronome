export interface Blueprint {
  name: string
  agent: string
  model: string
  timeout: number
  max_turns?: number
  system: string
  skills?: string[]
  prompt_template?: string
}
