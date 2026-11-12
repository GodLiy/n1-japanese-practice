import { isWeChat } from './device.ts'

export type GuideReason = 'listen' | 'speak'

type Listener = (reason: GuideReason | null) => void

let reason: GuideReason | null = null
const listeners = new Set<Listener>()

export function showHostGuide(next: GuideReason): void {
  if (!isWeChat()) return
  reason = next
  for (const listener of listeners) listener(reason)
}

export function dismissHostGuide(): void {
  reason = null
  for (const listener of listeners) listener(reason)
}

export function subscribeHostGuide(listener: Listener): () => void {
  listeners.add(listener)
  listener(reason)
  return () => {
    listeners.delete(listener)
  }
}
