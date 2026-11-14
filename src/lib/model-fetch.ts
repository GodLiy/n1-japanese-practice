import { filePathFromCacheKey } from './asr-runtime.ts'
import { ASR_FILES, ASR_MODEL_ID, ASR_REVISION, MODEL_MIRROR_BASES, type AsrFile } from './asr-pack.ts'
import { asBlob, concatBytes, sha256Hex } from './bytes.ts'
import { markModelStored, readModelFile, rememberModelFile, rememberedModelFile, writeModelFile } from './model-store.ts'

const HUGGING_FACE = 'Hugging Face'
const MIRROR_LABELS = ['国内镜像', 'jsDelivr']
const CACHE_NAME = 'transformers-cache'
const IDLE_MS = 40000

type ModelCache = {
  match: (key: RequestInfo | URL) => Promise<Response | undefined>
  put: (key: RequestInfo | URL, response: Response) => Promise<void>
}

export function modelFileUrl(path: string): string {
  return `https://huggingface.co/${ASR_MODEL_ID}/resolve/${ASR_REVISION}/${path}`
}

export function installModelCache(env: { useBrowserCache: boolean; useCustomCache: boolean; customCache: ModelCache | null }): void {
  env.useBrowserCache = false
  env.useCustomCache = true
  env.customCache = {
    async match(key) {
      const path = filePathFromCacheKey(cacheKey(key))
      if (!path) return undefined
      const memory = rememberedModelFile(path)
      if (memory) return fileResponse(memory.bytes)
      const stored = await readModelFile(path)
      if (!stored) return undefined
      rememberModelFile(path, stored.sha256, stored.bytes)
      return fileResponse(stored.bytes)
    },
    async put(key, response) {
      try {
        const path = filePathFromCacheKey(cacheKey(key))
        if (!path || rememberedModelFile(path)) return
        const bytes = new Uint8Array(await response.arrayBuffer())
        const sha256 = await sha256Hex(bytes)
        rememberModelFile(path, sha256, bytes)
        markModelStored(await writeModelFile(path, sha256, bytes))
      } catch {
        // The file is already in memory for this page. A storage miss must not cancel recognition.
      }
    },
  }
}

export async function seedAsrCache(
  onProgress: (loaded: number, total: number, source: string) => void,
  cancelled: () => boolean,
): Promise<void> {
  const total = ASR_FILES.reduce((sum, file) => sum + file.bytes, 0)
  let loaded = 0
  for (const file of ASR_FILES) {
    if (cancelled()) throw cancelledError()
    const memory = rememberedModelFile(file.path)
    if (memory?.sha256 === file.sha256) {
      loaded += file.bytes
      onProgress(loaded, total, '本机缓存')
      continue
    }
    const stored = await readModelFile(file.path)
    if (stored?.sha256 === file.sha256) {
      rememberModelFile(file.path, stored.sha256, stored.bytes)
      loaded += file.bytes
      onProgress(loaded, total, '本机缓存')
      continue
    }
    const legacy = await readLegacy(file)
    if (legacy) {
      rememberModelFile(file.path, file.sha256, legacy)
      const saved = await writeModelFile(file.path, file.sha256, legacy)
      markModelStored(saved)
      if (saved) await deleteLegacy(file)
      loaded += file.bytes
      onProgress(loaded, total, '本机缓存')
      continue
    }
    const bytes = await loadFile(file, (amount, source) => onProgress(loaded + amount, total, source), cancelled)
    if (await sha256Hex(bytes) !== file.sha256) throw new Error('checksum')
    rememberModelFile(file.path, file.sha256, bytes)
    markModelStored(await writeModelFile(file.path, file.sha256, bytes))
    loaded += file.bytes
  }
}

function fileResponse(bytes: Uint8Array): Response {
  return new Response(asBlob(bytes), {
    status: 200,
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Length': String(bytes.byteLength),
    },
  })
}

function cacheKey(key: RequestInfo | URL): string {
  if (typeof key === 'string') return key
  if (key instanceof URL) return key.href
  return key.url
}

async function openLegacy(): Promise<Cache | null> {
  if (typeof caches === 'undefined') return null
  try {
    return await caches.open(CACHE_NAME)
  } catch {
    return null
  }
}

async function readLegacy(file: AsrFile): Promise<Uint8Array<ArrayBuffer> | null> {
  const cache = await openLegacy()
  if (!cache) return null
  const url = modelFileUrl(file.path)
  try {
    const hit = await cache.match(url)
    if (!hit) return null
    const bytes = new Uint8Array(await hit.arrayBuffer())
    if (await sha256Hex(bytes) !== file.sha256) {
      await cache.delete(url)
      return null
    }
    return bytes
  } catch {
    try {
      await cache.delete(url)
    } catch {
      // The old cache entry could not be read. The mirror download replaces it.
    }
    return null
  }
}

async function deleteLegacy(file: AsrFile): Promise<void> {
  const cache = await openLegacy()
  try {
    await cache?.delete(modelFileUrl(file.path))
  } catch {
    // Leaving the old entry only costs disk. Recognition already has the file.
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
