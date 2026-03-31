import Ajv from 'ajv'

const ajv = new Ajv({ allErrors: true })

export function extractStructured(output: string): unknown | null {
  const match = output.match(/```json\s*([\s\S]*?)```/)
  if (match) {
    try { return JSON.parse(match[1].trim()) } catch {}
  }
  try { return JSON.parse(output.trim()) } catch {}
  return null
}

export function extractAndValidate(
  output: string,
  schema?: Record<string, unknown>,
): { data: unknown; valid: boolean; errors?: string[] } {
  const data = extractStructured(output)
  if (!data) return { data: null, valid: false, errors: ['no JSON block found in output'] }
  if (!schema) return { data, valid: true }

  const validate = ajv.compile(schema)
  const valid = validate(data)
  return {
    data,
    valid: !!valid,
    errors: valid ? undefined : validate.errors?.map((e) => `${e.instancePath} ${e.message}`) || [],
  }
}

export function renderTemplate(template: string, vars: Record<string, string | undefined>): string {
  let result = template

  result = result.replace(/\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (_match, key, content) => {
    return vars[key] ? content : ''
  })

  result = result.replace(/\{\{(\w+)\}\}/g, (_match, key) => {
    return vars[key] ?? ''
  })

  return result.trim()
}
