/**
 * 에이전트의 free-form 출력에서 ```json 블록을 추출
 */
export function extractStructured(output: string): unknown | null {
  const match = output.match(/```json\s*([\s\S]*?)```/)
  if (!match) return null
  try {
    return JSON.parse(match[1].trim())
  } catch {
    return null
  }
}

/**
 * 간단한 머스태시 템플릿 렌더링
 *
 * {{prompt}} → 값 치환
 * {{#if context}} ... {{/if}} → 조건부 렌더링
 */
export function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  let result = template

  // {{#if key}} ... {{/if}} 처리
  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, content) => {
    return vars[key] ? content : ''
  })

  // {{key}} 치환
  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return vars[key] ?? ''
  })

  return result.trim()
}
