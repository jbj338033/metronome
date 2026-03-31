export interface Blueprint {
  name: string
  agent: string
  model: string
  model_routing?: 'auto' | 'fixed'
  timeout: number
  max_turns?: number
  system: string
  skills?: string[]
  prompt_template?: string
  output_schema?: Record<string, unknown>
}
