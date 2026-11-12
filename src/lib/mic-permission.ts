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
  if (!navigator.mediaDevices?.getUserMedia) return 'denied'
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    stream.getTracks().forEach((track) => track.stop())
    return 'granted'
  } catch (error: unknown) {
    const name = error && typeof error === 'object' && 'name' in error ? String((error as { name: string }).name) : ''
    if (name === 'NotAllowedError' || name === 'SecurityError') return 'denied'
    if (name === 'NotFoundError') return 'denied'
    return 'denied'
  }
}

export function permissionLabel(state: MicPermission): string {
  if (state === 'granted') return '已允许'
  if (state === 'denied') return '已阻止'
  if (state === 'prompt') return '还没有允许'
  return '还没有询问'
}
