let shared: AudioContext | null = null

export function unlockAudio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  try {
    if (!shared || shared.state === 'closed') shared = new Ctor()
    if (shared.state === 'suspended') void shared.resume()
    return shared
  } catch {
    return null
  }
}

/** A one-sample buffer starts the context inside the user tap. Baidu's T7 kernel stays suspended without it. */
export function kickAudio(): void {
  const ctx = unlockAudio()
  if (!ctx) return
  try {
    const buffer = ctx.createBuffer(1, 8, ctx.sampleRate || 22050)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(ctx.destination)
    source.start()
  } catch {
    /* the context cannot play yet; resume() was already requested */
  }
}

export function watchLevel(stream: MediaStream, onShown: (level: number) => void, onRms: (rms: number) => void): () => void {
  const ctx = unlockAudio()
  if (!ctx) return () => {}
  let source: MediaStreamAudioSourceNode
  try {
    source = ctx.createMediaStreamSource(stream)
  } catch {
    return () => {}
  }
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  source.connect(analyser)
  const data = new Uint8Array(analyser.fftSize)
  let frame = 0
  let lastShown = -1
  const tick = () => {
    analyser.getByteTimeDomainData(data)
    let sum = 0
    for (let i = 0; i < data.length; i += 1) {
      const sample = ((data[i] ?? 128) - 128) / 128
      sum += sample * sample
    }
    const rms = Math.sqrt(sum / data.length)
    onRms(rms)
    const shown = Math.round(Math.min(1, rms * 5) * 20) / 20
    if (shown !== lastShown) {
      lastShown = shown
      onShown(shown)
    }
    frame = window.requestAnimationFrame(tick)
  }
  frame = window.requestAnimationFrame(tick)
  return () => {
    window.cancelAnimationFrame(frame)
    source.disconnect()
    analyser.disconnect()
  }
}

export class DecodeError extends Error {
  constructor(message = 'decode') {
    super(message)
    this.name = 'DecodeError'
  }
}

/** Linear resample to the 16 kHz mono Whisper expects. */
export function resampleTo16k(input: Float32Array, sampleRate: number): Float32Array {
  if (input.length === 0) return input
  if (!sampleRate || Math.abs(sampleRate - 16000) < 1) return input
  const ratio = sampleRate / 16000
  const length = Math.max(1, Math.round(input.length / ratio))
  const out = new Float32Array(length)
  const last = input.length - 1
  for (let i = 0; i < length; i += 1) {
    const pos = i * ratio
    const index = Math.floor(pos)
    const frac = pos - index
    const a = input[index] ?? 0
    const b = input[Math.min(index + 1, last)] ?? a
    out[i] = a + (b - a) * frac
  }
  return out
}

export type PcmCapture = {
  stop: () => Float32Array
}

/**
 * Record the live microphone as PCM. Android and several mobile browsers
 * cannot decode the MediaRecorder file afterwards, so recognition uses this.
 */
export function startPcmCapture(stream: MediaStream): PcmCapture | null {
  const ctx = unlockAudio()
  if (!ctx || typeof ctx.createScriptProcessor !== 'function') return null
  if (ctx.state === 'suspended') void ctx.resume()
  let source: MediaStreamAudioSourceNode
  let processor: ScriptProcessorNode
  try {
    source = ctx.createMediaStreamSource(stream)
    processor = ctx.createScriptProcessor(4096, 1, 1)
  } catch {
    return null
  }
  const chunks: Float32Array[] = []
  let stopped = false
  let taken: Float32Array | null = null
  processor.onaudioprocess = (event) => {
    if (stopped) return
    chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)))
    event.outputBuffer.getChannelData(0).fill(0)
  }
  try {
    source.connect(processor)
    processor.connect(ctx.destination)
  } catch {
    return null
  }
  return {
    stop() {
      if (taken) return taken
      stopped = true
      try { processor.disconnect() } catch { /* already stopped */ }
      try { source.disconnect() } catch { /* already stopped */ }
      const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
      const merged = new Float32Array(total)
      let offset = 0
      for (const chunk of chunks) {
        merged.set(chunk, offset)
        offset += chunk.length
      }
      taken = resampleTo16k(merged, ctx.sampleRate || 48000)
      return taken
    },
  }
}

export async function blobTo16k(blob: Blob): Promise<Float32Array> {
  const ctx = unlockAudio()
  if (!ctx) throw new DecodeError('no-audio-context')
  if (ctx.state === 'suspended') await ctx.resume()
  let decoded: AudioBuffer
  try {
    decoded = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'decode'
    throw new DecodeError(message)
  }
  const frames = Math.max(1, Math.ceil(decoded.duration * 16000))
  const offline = new OfflineAudioContext(1, frames, 16000)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}
