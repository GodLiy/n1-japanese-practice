import type { Activity, ItemRecord, Mode, Persisted, Settings } from '../types.ts'
import { localDay, shiftDay } from './day.ts'

export const STORAGE_KEY = 'chowa-v1'

export const RATE_REV = 2

export const defaultSettings: Settings = {
  rate: 1.2,
  rateRev: RATE_REV,
  furigana: true,
  hints: true,
  theme: 'light',
  localAsr: true,
}

export function emptyState(): Persisted {
  return {
    settings: { ...defaultSettings },
    records: {},
    streak: { count: 0, lastDay: '' },
    activity: [],
    savedWords: [],
  }
}

export function loadState(): Persisted {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyState()
    const parsed = JSON.parse(raw) as Partial<Persisted>
    const settings = { ...defaultSettings, ...parsed.settings }
    if ((parsed.settings?.rateRev ?? 1) < RATE_REV) {
      if (parsed.settings?.rate == null || parsed.settings.rate === 1) settings.rate = defaultSettings.rate
      settings.rateRev = RATE_REV
    }
    return {
      settings,
      records: parsed.records ?? {},
      streak: parsed.streak?.lastDay ? parsed.streak : { count: 0, lastDay: '' },
      activity: Array.isArray(parsed.activity) ? parsed.activity : [],
      savedWords: Array.isArray(parsed.savedWords) ? parsed.savedWords.filter((id) => typeof id === 'string') : [],
    }
  } catch {
    return emptyState()
  }
}

export function recordKey(mode: Mode, id: string): string {
  return `${mode}:${id}`
}

export function withResult(prev: Persisted, mode: Mode, id: string, title: string, score: number): Persisted {
  const safeScore = Math.max(0, Math.min(100, Math.round(score)))
  const latest = prev.activity[0]
  if (
    latest &&
    latest.mode === mode &&
    latest.id === id &&
    latest.score === safeScore &&
    Date.now() - latest.at < 1500
  ) {
    return prev
  }
  const key = recordKey(mode, id)
  const old: ItemRecord | undefined = prev.records[key]
  const today = localDay()
  const streak =
    prev.streak.lastDay === today
      ? prev.streak
      : {
          count: prev.streak.lastDay === shiftDay(today, -1) ? prev.streak.count + 1 : 1,
          lastDay: today,
        }
  const activity: Activity[] = [{ at: Date.now(), mode, id, score: safeScore, title }, ...prev.activity].slice(0, 40)
  return {
    ...prev,
    streak,
    activity,
    records: {
      ...prev.records,
      [key]: {
        best: Math.max(old?.best ?? 0, safeScore),
        last: safeScore,
        attempts: (old?.attempts ?? 0) + 1,
        updatedAt: Date.now(),
      },
    },
  }
}
