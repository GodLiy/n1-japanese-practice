import { isBaidu, isNativeApp } from './device.ts'
import { openMicrophone } from './mic-open.ts'
import { prepareNativeMic } from './native-mic.ts'

export type MicPermission = 'unknown' | 'prompt' | 'granted' | 'denied'

export async function readMicPermission(): Promise<MicPermission> {
  if (typeof navigator === 'undefined' || !navigator.permissions?.query) return 'unknown'
  try {
    const status = await navigator.permissions.query({ name: 'microphone' as PermissionName })
    if (status.state === 'granted' || status.state === 'denied' || status.state === 'prompt') return status.state
  } catch {
    return 'unknown'
  }
  return 'unknown'
}

export async function requestMicrophone(): Promise<MicPermission> {
  try {
    if (isNativeApp()) {
      const allowed = await prepareNativeMic()
      if (!allowed) return 'denied'
    }
    const stream = await openMicrophone()
    const open = stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted)
    stream.getTracks().forEach((track) => track.stop())
    if (!open && isBaidu()) return 'denied'
    return 'granted'
  } catch (error: unknown) {
    const name = error && typeof error === 'object' && 'name' in error ? String((error as { name: string }).name) : ''
    if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'MicSilent' || name === 'NotFoundError') return 'denied'
    return 'denied'
  }
}

export function permissionLabel(state: MicPermission): string {
  if (state === 'granted') return '已允许'
  if (state === 'denied') return '已阻止'
  if (state === 'prompt') return '还没有允许'
  return '还没有询问'
}
