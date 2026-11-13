import { registerPlugin } from '@capacitor/core'
import { isNativeApp } from './device.ts'

type MicPlugin = {
  request: () => Promise<{ granted?: boolean }>
}

const chowaMic = registerPlugin<MicPlugin>('ChowaMic', {
  web: () => ({
    request: async () => ({ granted: true }),
  }),
})

/** On Android, ask the system before getUserMedia so the WebView is not inside a capture request. */
export async function prepareNativeMic(): Promise<boolean> {
  if (!isNativeApp()) return true
  try {
    const result = await chowaMic.request()
    return result.granted !== false
  } catch {
    return false
  }
}

export function quietPlayback(): void {
  if (typeof document === 'undefined') return
  document.querySelectorAll('audio').forEach((node) => {
    try {
      node.pause()
    } catch {
      /* already stopped */
    }
  })
  try {
    window.speechSynthesis?.cancel()
  } catch {
    /* nothing was speaking */
  }
}
