interface ModelTier {
  id: string
  model: string
  complexity: 'low' | 'medium' | 'high'
  inputCost: number
  outputCost: number
}

const tiers: ModelTier[] = [
  { id: 'fast', model: 'haiku', complexity: 'low', inputCost: 0.25, outputCost: 1.25 },
  { id: 'balanced', model: 'sonnet', complexity: 'medium', inputCost: 3, outputCost: 15 },
  { id: 'powerful', model: 'opus', complexity: 'high', inputCost: 15, outputCost: 75 },
]

const complexityRank: Record<string, number> = { low: 0, medium: 1, high: 2 }

export function selectModel(
  complexity: string,
  blueprintModel?: string,
  override?: string,
): string {
  if (override) return override

  const rank = complexityRank[complexity] ?? 1
  const suitable = tiers.filter((t) => complexityRank[t.complexity] >= rank)
  if (suitable.length > 0) return suitable[0].model

  return blueprintModel || 'sonnet'
}

export function estimateCost(model: string, tokensIn: number, tokensOut: number): number {
  const tier = tiers.find((t) => t.model === model)
  if (!tier) return 0
  return (tokensIn / 1_000_000) * tier.inputCost + (tokensOut / 1_000_000) * tier.outputCost
}

export function getModelTiers() {
  return tiers
}

export function selectAgentAndModel(profile: { type: string; complexity: string }): { agent: string; model: string } {
  if (profile.type === 'research') {
    return { agent: 'claude-code', model: 'sonnet' }
  }
  if (profile.type === 'plan' && profile.complexity === 'high') {
    return { agent: 'claude-code', model: 'opus' }
  }

  const model = selectModel(profile.complexity)
  return { agent: 'claude-code', model }
}
