import { isBaidu, isWeChat } from './device.ts'

export type GuideReason = 'listen' | 'speak'
export type GuideHost = 'wechat' | 'baidu'
export type GuideNotice = { reason: GuideReason; host: GuideHost }

type Listener = (notice: GuideNotice | null) => void

let notice: GuideNotice | null = null
const listeners = new Set<Listener>()

function currentHost(): GuideHost | null {
  if (isWeChat()) return 'wechat'
  if (isBaidu()) return 'baidu'
  return null
}

export function showHostGuide(next: GuideReason): void {
  const host = currentHost()
  if (!host) return
  notice = { reason: next, host }
  for (const listener of listeners) listener(notice)
}

export function dismissHostGuide(): void {
  notice = null
  for (const listener of listeners) listener(notice)
}

export function subscribeHostGuide(listener: Listener): () => void {
  listeners.add(listener)
  listener(notice)
  return () => {
    listeners.delete(listener)
  }
}
