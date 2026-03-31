export function formatRelativeTime(iso: string) {
  const date = new Date(
    iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z',
  )
  const ms = Date.now() - date.getTime()
  if (Number.isNaN(ms)) return ''
  if (ms < 60_000) return 'just now'
  const m = Math.floor(ms / 60_000)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function formatDuration(start: string, end: string | null) {
  if (!end) return '—'
  const ms =
    new Date(end + 'Z').getTime() - new Date(start + 'Z').getTime()
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}

export function formatElapsed(start: string | null, end: string | null) {
  if (!start) return '—'
  const from = new Date(start + 'Z').getTime()
  const to = end ? new Date(end + 'Z').getTime() : Date.now()
  const s = Math.floor((to - from) / 1000)
  if (s < 60) return `${s}s`
  return `${Math.floor(s / 60)}m ${s % 60}s`
}
