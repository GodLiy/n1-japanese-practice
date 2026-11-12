export function localDay(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function shiftDay(day: string, delta: number): string {
  const [y, m, d] = day.split('-').map(Number)
  const date = new Date(y || 0, (m || 1) - 1, d || 1)
  date.setDate(date.getDate() + delta)
  return localDay(date)
}

export function dayIndex(date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0)
  return Math.floor((date.getTime() - start.getTime()) / 86400000)
}

export function suggestId(ids: string[], mastered: Set<string>, salt: number, date = new Date()): string {
  if (!ids.length) return ''
  const start = (dayIndex(date) + salt) % ids.length
  const order = [...ids.slice(start), ...ids.slice(0, start)]
  return order.find((id) => !mastered.has(id)) ?? order[0]
}

export function formatWhen(at: number): string {
  const date = new Date(at)
  const day = localDay(date)
  const hm = `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  if (day === localDay()) return `今天 ${hm}`
  if (day === shiftDay(localDay(), -1)) return `昨天 ${hm}`
  return `${date.getMonth() + 1}月${date.getDate()}日 ${hm}`
}

export function averageBest(records: Record<string, { best: number; attempts: number }>, prefix: string): number | null {
  const list = Object.entries(records).filter(([key, value]) => key.startsWith(prefix) && value.attempts > 0)
  if (!list.length) return null
  const sum = list.reduce((total, [, value]) => total + value.best, 0)
  return Math.round(sum / list.length)
}
