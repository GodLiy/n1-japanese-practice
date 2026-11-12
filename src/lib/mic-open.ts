import { isBaidu } from './device.ts'
import { kickAudio, unlockAudio } from './audio-local.ts'

type LegacyGetUserMedia = (
  constraints: MediaStreamConstraints,
  success: (stream: MediaStream) => void,
  failure: (error: unknown) => void,
) => void

const AUDIO_ONLY: MediaStreamConstraints = { audio: true }

function legacyGetUserMedia(): LegacyGetUserMedia | null {
  if (typeof navigator === 'undefined') return null
  const host = navigator as Navigator & {
    getUserMedia?: LegacyGetUserMedia
    webkitGetUserMedia?: LegacyGetUserMedia
  }
  return host.webkitGetUserMedia ?? host.getUserMedia ?? null
}

function callLegacy(fn: LegacyGetUserMedia): Promise<MediaStream> {
  return new Promise((resolve, reject) => {
    try {
      fn.call(navigator, AUDIO_ONLY, resolve, reject)
    } catch (error) {
      reject(error)
    }
  })
}

function callModern(): Promise<MediaStream> | null {
  const fn = navigator.mediaDevices?.getUserMedia
  if (!fn) return null
  return fn.call(navigator.mediaDevices, AUDIO_ONLY)
}

export function canCaptureMic(): boolean {
  if (typeof MediaRecorder === 'undefined') return false
  return Boolean(navigator.mediaDevices?.getUserMedia || legacyGetUserMedia())
}

function enableTracks(stream: MediaStream): void {
  for (const track of stream.getAudioTracks()) track.enabled = true
  const ctx = unlockAudio()
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

function stopTracks(stream: MediaStream): void {
  stream.getTracks().forEach((track) => {
    try {
      track.stop()
    } catch {
      /* already stopped */
    }
  })
}

function trackIsOpen(track: MediaStreamTrack): boolean {
  return track.readyState === 'live' && track.enabled && !track.muted
}

function hasOpenTrack(stream: MediaStream): boolean {
  return stream.getAudioTracks().some(trackIsOpen)
}

function waitForAudio(stream: MediaStream): Promise<boolean> {
  if (hasOpenTrack(stream)) return Promise.resolve(true)
  if (!stream.getAudioTracks().length) return Promise.resolve(false)
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(hasOpenTrack(stream)), 500)
    const done = () => {
      window.clearTimeout(timer)
      resolve(hasOpenTrack(stream))
    }
    for (const track of stream.getAudioTracks()) track.addEventListener('unmute', done)
  })
}

function silentError(): Error {
  const error = new Error('silent')
  error.name = 'MicSilent'
  return error
}

async function recoverBaidu(stream: MediaStream, retry: (() => Promise<MediaStream>) | null): Promise<MediaStream> {
  enableTracks(stream)
  if (await waitForAudio(stream)) return stream
  stopTracks(stream)
  if (!retry) throw silentError()
  const again = await retry()
  enableTracks(again)
  if (await waitForAudio(again)) return again
  if (!again.getAudioTracks().length) {
    stopTracks(again)
    throw silentError()
  }
  return again
}

/** Starts the permission request before the first await, so the call stays inside the tap. */
export function openMicrophone(): Promise<MediaStream> {
  const legacy = legacyGetUserMedia()
  const baidu = isBaidu()
  if (baidu) kickAudio()

  if (baidu && legacy) {
    const first = callLegacy(legacy)
    const modern = () => callModern()
    return first.then(
      (stream) => recoverBaidu(stream, () => {
        const next = modern()
        return next ?? callLegacy(legacy)
      }),
      (error) => {
        const next = modern()
        if (!next) return Promise.reject(error)
        return next.then((stream) => recoverBaidu(stream, null))
      },
    )
  }

  const modern = callModern()
  if (modern) {
    if (!baidu) {
      return modern.then((stream) => {
        enableTracks(stream)
        return stream
      })
    }
    return modern.then((stream) => recoverBaidu(stream, () => {
      const again = callModern()
      if (!again) throw silentError()
      return again
    }))
  }

  if (legacy) {
    return callLegacy(legacy).then((stream) => {
      enableTracks(stream)
      return baidu ? recoverBaidu(stream, null) : stream
    })
  }

  const missing = new Error('no-mic')
  missing.name = 'NotFoundError'
  return Promise.reject(missing)
}
