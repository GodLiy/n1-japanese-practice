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

export function watchLevel(stream: MediaStream, onShown: (level: number) => void, onRms: (rms: number) => void): () => void {
  const ctx = unlockAudio()
  if (!ctx) return () => {}
  const source = ctx.createMediaStreamSource(stream)
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

export async function blobTo16k(blob: Blob): Promise<Float32Array> {
  const ctx = unlockAudio()
  if (!ctx) throw new Error('这台浏览器不能处理录音。可以把句子打在下面。')
  if (ctx.state === 'suspended') await ctx.resume()
  const decoded = await ctx.decodeAudioData((await blob.arrayBuffer()).slice(0))
  const frames = Math.max(1, Math.ceil(decoded.duration * 16000))
  const offline = new OfflineAudioContext(1, frames, 16000)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()
  return rendered.getChannelData(0)
}
