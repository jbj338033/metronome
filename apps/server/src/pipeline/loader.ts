import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import YAML from 'yaml'
import type { Pipeline, Blueprint } from '@metronome/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..')
const BLUEPRINTS_DIR = path.join(ROOT, 'blueprints')
const PIPELINES_DIR = path.join(ROOT, 'pipelines')

export function loadBlueprint(name: string): Blueprint | null {
  const file = path.join(BLUEPRINTS_DIR, `${name}.yaml`)
  if (!fs.existsSync(file)) return null
  return YAML.parse(fs.readFileSync(file, 'utf-8'))
}

export function listBlueprints(): Blueprint[] {
  if (!fs.existsSync(BLUEPRINTS_DIR)) return []
  return fs.readdirSync(BLUEPRINTS_DIR)
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => YAML.parse(fs.readFileSync(path.join(BLUEPRINTS_DIR, f), 'utf-8')))
}

export function saveBlueprint(blueprint: Blueprint): void {
  const file = path.join(BLUEPRINTS_DIR, `${blueprint.name}.yaml`)
  fs.writeFileSync(file, YAML.stringify(blueprint), 'utf-8')
}

export function deleteBlueprint(name: string): boolean {
  const file = path.join(BLUEPRINTS_DIR, `${name}.yaml`)
  if (!fs.existsSync(file)) return false
  fs.unlinkSync(file)
  return true
}

export function loadPipeline(id: string): Pipeline | null {
  // defaults 먼저, 그다음 custom
  for (const sub of ['defaults', 'custom']) {
    const file = path.join(PIPELINES_DIR, sub, `${id}.yaml`)
    if (fs.existsSync(file)) {
      return YAML.parse(fs.readFileSync(file, 'utf-8'))
    }
  }
  return null
}

export function listPipelines(): Array<Pipeline & { source: string }> {
  const result: Array<Pipeline & { source: string }> = []
  for (const sub of ['defaults', 'custom']) {
    const dir = path.join(PIPELINES_DIR, sub)
    if (!fs.existsSync(dir)) continue
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.yaml'))) {
      const pipeline = YAML.parse(fs.readFileSync(path.join(dir, f), 'utf-8'))
      result.push({ ...pipeline, source: sub })
    }
  }
  return result
}

export function savePipeline(pipeline: Pipeline, source: 'custom' | 'defaults' = 'custom'): void {
  const dir = path.join(PIPELINES_DIR, source)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, `${pipeline.name}.yaml`), YAML.stringify(pipeline), 'utf-8')
}
