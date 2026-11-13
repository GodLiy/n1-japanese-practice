import { ASR_FILES, ASR_MODEL_ID, ASR_REVISION, MODEL_MIRROR_BASES, type AsrFile } from './asr-pack.ts'
import { asBlob, concatBytes, sha256Hex } from './bytes.ts'

const HUGGING_FACE = 'Hugging Face'
const MIRROR_LABELS = ['国内镜像', 'jsDelivr']
const IDLE_MS = 40000

export function modelFileUrl(path: string): string {
  return `https://huggingface.co/${ASR_MODEL_ID}/resolve/${ASR_REVISION}/${path}`
}

export async function seedAsrCache(
  onProgress: (loaded: number, total: number, source: string) => void,
  cancelled: () => boolean,
): Promise<void> {
  const total = ASR_FILES.reduce((sum, file) => sum + file.bytes, 0)
  let loaded = 0
  const cache = await openCache()
  for (const file of ASR_FILES) {
    if (cancelled()) throw cancelledError()
    const url = modelFileUrl(file.path)
    const cached = cache ? await cache.match(url) : undefined
    if (cached) {
      const bytes = new Uint8Array(await cached.arrayBuffer())
      if (await sha256Hex(bytes) === file.sha256) {
        loaded += file.bytes
        onProgress(loaded, total, '本机缓存')
        continue
      }
      await cache?.delete(url)
    }
    const bytes = await loadFile(file, (amount, source) => onProgress(loaded + amount, total, source), cancelled)
    if (await sha256Hex(bytes) !== file.sha256) throw new Error('checksum')
    if (cache) {
      await cache.put(url, new Response(asBlob(bytes), {
        status: 200,
        headers: { 'Content-Type': 'application/octet-stream', 'Content-Length': String(bytes.byteLength) },
      }))
    }
    loaded += file.bytes
  }
}

async function openCache(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open('transformers-cache')
  } catch {
    return null
  }
}

async function loadFile(file: AsrFile, onProgress: (loaded: number, source: string) => void, cancelled: () => boolean): Promise<Uint8Array> {
  try {
    const parts: Uint8Array[] = []
    let got = 0
    let source = '国内镜像'
    for (const part of file.parts) {
      const downloaded = await loadPart(part, (amount, label) => {
        source = label
        onProgress(got + amount, label)
      }, cancelled)
      parts.push(downloaded.bytes)
      got += downloaded.bytes.byteLength
      source = downloaded.source
    }
    const merged = concatBytes(parts)
    if (await sha256Hex(merged) !== file.sha256) throw new Error('checksum')
    onProgress(file.bytes, source)
    return merged
  } catch (error) {
    if (isCancelled(error)) throw error
    return fetchBytes(modelFileUrl(file.path), HUGGING_FACE, (amount) => onProgress(amount, HUGGING_FACE), cancelled)
  }
}

async function loadPart(
  part: { branch: string; path: string },
  onProgress: (loaded: number, source: string) => void,
  cancelled: () => boolean,
): Promise<{ bytes: Uint8Array; source: string }> {
  let last: unknown
  for (let index = 0; index < MODEL_MIRROR_BASES.length; index += 1) {
    const label = MIRROR_LABELS[index] ?? '镜像'
    try {
      const bytes = await fetchBytes(`${MODEL_MIRROR_BASES[index]}${part.branch}/${part.path}`, label, (amount) => onProgress(amount, label), cancelled)
      return { bytes, source: label }
    } catch (error) {
      if (isCancelled(error)) throw error
      last = error
    }
  }
  throw last instanceof Error ? last : new Error('part')
}

async function fetchBytes(url: string, source: string, onProgress: (loaded: number) => void, cancelled: () => boolean): Promise<Uint8Array> {
  const controller = new AbortController()
  let idle = 0
  const arm = () => {
    window.clearTimeout(idle)
    idle = window.setTimeout(() => controller.abort(), IDLE_MS)
  }
  try {
    arm()
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok || !response.body) throw new Error(`${source} ${response.status}`)
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let got = 0
    while (true) {
      if (cancelled()) {
        controller.abort()
        throw cancelledError()
      }
      arm()
      const step = await reader.read()
      if (step.done) break
      chunks.push(step.value)
      got += step.value.byteLength
      onProgress(got)
    }
    return concatBytes(chunks)
  } catch (error) {
    if (cancelled()) throw cancelledError()
    throw error
  } finally {
    window.clearTimeout(idle)
  }
}

function cancelledError(): Error {
  const error = new Error('cancelled')
  error.name = 'AsrCancelled'
  return error
}

function isCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'AsrCancelled'
}
