/**
 * dot-path 기반 truthy 조건 평가
 *
 * "review.has_issues" → results["review"].structured.has_issues → Boolean()
 */
export function evaluateCondition(
  expr: string,
  results: Map<string, { structured?: unknown }>,
): boolean {
  const parts = expr.split('.')
  if (parts.length < 2) return false

  const [stepId, ...path] = parts
  const result = results.get(stepId)
  if (!result?.structured) return false

  let value: unknown = result.structured
  for (const key of path) {
    if (value == null || typeof value !== 'object') return false
    value = (value as Record<string, unknown>)[key]
  }

  return Boolean(value)
}
