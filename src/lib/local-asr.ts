import { blobTo16k, DecodeError } from './audio-local.ts'
import { applyOrtRuntime, type WasmEnv } from './asr-runtime.ts'
import { ASR_MODEL_ID, ASR_REVISION } from './asr-pack.ts'
import { isAppleTouch, isBaidu, isNativeApp, isQQ, isWeChat } from './device.ts'
import { installModelCache, seedAsrCache } from './model-fetch.ts'
import { releaseRememberedModel } from './model-store.ts'
import { loadOrtRuntime } from './ort-runtime.ts'

/** Whisper small on the website and in the Android app. Larger than the old base model, still local. */
export const LOCAL_ASR_MODEL = ASR_MODEL_ID
export const LOCAL_ASR_NOTE = '手机和浏览器用同一个 Whisper small 日语模型，大约 250MB，另有约 22MB 运行库。只在第一次下载，之后留在这台设备里。国内会先试镜像。下载时可以取消，页面不会被卡住。录音不会上传。'

const HALLUCINATION = /^(ご視聴ありがとうございました|字幕制作|字幕作成|ご視聴ありがとう)[。！…\s]*$/
const STALL_MS = 180000

type Transcriber = (
  audio: Float32Array,
  options: { language: string; task: string; chunk_length_s: number; stride_length_s: number },
) => Promise<{ text?: string } | string>

type Progress = { status?: string; file?: string; progress?: number; loaded?: number; total?: number }

export class AsrCancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'AsrCancelled'
  }
}

export type AsrKind = 'download' | 'runtime' | 'decode' | 'timeout' | 'storage' | 'recognize'

export class AsrError extends Error {
  readonly kind: AsrKind

  constructor(kind: AsrKind, message: string) {
    super(message)
    this.name = 'AsrError'
    this.kind = kind
  }
}

let loading: Promise<Transcriber> | null = null
let ready: Transcriber | null = null
let generation = 0
let lastBeat = 0
let lastPercent = -1
let acceptProgress = false

export function cancelModelLoad(): void {
  generation += 1
  loading = null
}

export function asrNeedsHostGuide(error: unknown): boolean {
  const failure = error instanceof AsrError ? error : classify(error)
  return failure.kind === 'runtime' && (isWeChat() || isQQ() || isBaidu())
}

export function asrFailureMessage(error: unknown): string {
  const failure = error instanceof AsrError ? error : classify(error)
  if (failure.kind === 'timeout') return '模型下载停住了，已经放开这个页面。声音没有上传。可以再试，或把句子打在下面。'
  if (failure.kind === 'storage') return '这台设备的存储空间不够，放不下识别模型。请清出大约 300MB 后再点一次说话。声音没有上传。'
  if (failure.kind === 'download' && /checksum/i.test(failure.message)) return '模型文件校验没有通过，没有使用这份文件。请再点一次说话。声音没有上传。'
  if (failure.kind === 'download') return '模型文件没有准备好。请再点一次说话。国内镜像会自动再试。声音没有上传。句子也可以打在下面。'
  if (failure.kind === 'decode') return '录音已经留下，但这台设备读不了这种格式。请再点一次说话。声音没有上传。'
  if (failure.kind === 'runtime') return runtimeMessage(failure)
  return '听到了声音，但识别没有完成。可以再点一次说话，或把句子打在下面。声音没有上传。'
}

function runtimeMessage(error: AsrError): string {
  if (/runtime checksum/i.test(error.message)) return '本机识别的运行库校验没有通过。请重新打开这个页面，再点一次说话。声音没有上传。'
  if (/runtime wasm|runtime part/i.test(error.message)) return '本机识别的运行库没有载入。请重新打开这个页面，再点一次说话。声音没有上传。'
  if (isWeChat()) {
    return isAppleTouch()
      ? '微信里无法启动本机识别。请点右上角「···」→「在Safari中打开」，再用 Safari 说话。句子也可以打在下面。声音没有上传。'
      : '微信里无法启动本机识别。请点右上角「···」→「在浏览器中打开」，用手机自带浏览器或 Chrome 说话。句子也可以打在下面。声音没有上传。'
  }
  if (isQQ()) {
    return isAppleTouch()
      ? 'QQ 里无法启动本机识别。请点右上角「···」→「在Safari中打开」。句子也可以打在下面。声音没有上传。'
      : 'QQ 里无法启动本机识别。请点右上角菜单 →「在浏览器中打开」，用手机自带浏览器或 Chrome 说话。句子也可以打在下面。声音没有上传。'
  }
  if (isBaidu()) {
    return '百度里无法启动本机识别。请点右上角菜单 →「在浏览器中打开」，用手机自带浏览器或 Chrome 说话。句子也可以打在下面。声音没有上传。'
  }
  if (isNativeApp()) return '这个应用没能启动本机识别。请完全关掉应用后再打开，然后点一次说话。句子也可以打在下面。声音没有上传。'
  if (/initWasm|previous call|script source URL/i.test(error.message)) return '本机识别没有启动。请重新打开这个页面，再点一次说话。声音没有上传。'
  return '本机识别没有启动。可以再点一次说话。声音没有上传。句子也可以打在下面。'
}

function asText(output: { text?: string } | string): string {
  const raw = typeof output === 'string' ? output : output.text ?? ''
  return raw.replace(/\s+/g, ' ').trim()
}

function beat(): void {
  lastBeat = Date.now()
}

function classify(error: unknown): AsrError {
  if (error instanceof AsrError) return error
  if (error instanceof DecodeError) return new AsrError('decode', error.message)
  const message = error instanceof Error ? `${error.name} ${error.message}` : String(error)
  if (/DecodeError|EncodingError|Unable to decode|decodeAudio/i.test(message)) return new AsrError('decode', message)
  if (/wasm|initWasm|SharedArray|no available backend|script source URL|runtime wasm|runtime checksum|runtime part/i.test(message)) return new AsrError('runtime', message)
  if (/QuotaExceeded|quota/i.test(message)) return new AsrError('storage', message)
  if (/checksum/i.test(message)) return new AsrError('download', message)
  if (/Failed to fetch|NetworkError|huggingface|404|403|504/i.test(message)) return new AsrError('download', message)
  return new AsrError('recognize', message)
}

async function createPipeline(onStatus: (message: string) => void, token: number): Promise<Transcriber> {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  installModelCache(env)
  await seedAsrCache((loaded, total, source) => {
    if (token !== generation) return
    beat()
    const shown = total ? Math.min(100, Math.round((100 * loaded) / total)) : 0
    if (shown === lastPercent && source !== '本机缓存') return
    lastPercent = shown
    onStatus(source === '本机缓存'
      ? '模型已在本机，正在启动识别…'
      : `正在从${source}下载识别模型 ${shown}%。可以取消，句子也能先打在下面。`)
  }, () => token !== generation)
  if (token !== generation) throw new AsrCancelled()
  onStatus('模型文件已核对，正在载入运行库…')
  const runtime = await loadOrtRuntime().catch((error: unknown) => {
    if (error instanceof Error && /runtime checksum/i.test(error.message)) throw error
    throw new Error('runtime wasm')
  })
  if (token !== generation) throw new AsrCancelled()
  const wasm = env.backends.onnx.wasm as WasmEnv
  // The runtime bytes stay on this page. A worker in the production build stops
  // with "document is not defined", and a file URL string is only a path prefix.
  applyOrtRuntime(wasm, runtime, true)
  beat()
  onStatus(wasm.proxy
    ? '模型文件已核对，正在启动识别…'
    : '模型文件已核对，正在启动识别…页面会停顿一下。')
  await new Promise((resolve) => window.setTimeout(resolve, 30))
  const transcriber = await pipeline('automatic-speech-recognition', LOCAL_ASR_MODEL, {
    dtype: 'q8',
    device: 'wasm',
    revision: ASR_REVISION,
    progress_callback: (info: Progress) => {
      if (!acceptProgress || token !== generation) return
      beat()
      if (info.status === 'ready') onStatus('模型已在本机，正在识别…')
    },
  })
  releaseRememberedModel()
  return transcriber as Transcriber
}

function loadModel(onStatus: (message: string) => void, token: number): Promise<Transcriber> {
  if (ready) {
    onStatus('模型已在本机，正在识别…')
    return Promise.resolve(ready)
  }
  if (loading && token === generation) return loading
  beat()
  lastPercent = -1
  acceptProgress = true
  onStatus('正在准备本机日语识别模型…可以取消。启动时页面会停顿一下。')
  let settled = false
  loading = new Promise<Transcriber>((resolve, reject) => {
    const timer = window.setInterval(() => {
      if (settled) {
        window.clearInterval(timer)
        return
      }
      if (token !== generation) {
        window.clearInterval(timer)
        settled = true
        reject(new AsrCancelled())
        return
      }
      if (Date.now() - lastBeat > STALL_MS) {
        window.clearInterval(timer)
        generation += 1
        loading = null
        settled = true
        reject(new AsrError('timeout', 'timeout'))
      }
    }, 2000)
    const finish = (transcriber: Transcriber) => {
      acceptProgress = false
      ready = transcriber
      if (settled || token !== generation) return
      settled = true
      window.clearInterval(timer)
      resolve(transcriber)
    }
    const fail = (error: unknown) => {
      acceptProgress = false
      if (loading && token === generation) loading = null
      if (settled) return
      settled = true
      window.clearInterval(timer)
      const cancelled = error instanceof AsrCancelled || (error instanceof Error && error.name === 'AsrCancelled')
      reject(cancelled ? new AsrCancelled() : classify(error))
    }
    void createPipeline(onStatus, token).then(finish).catch(fail)
  })
  return loading
}

async function withCancel<T>(work: Promise<T>, token: number): Promise<T> {
  let timer = 0
  const cancelled = new Promise<never>((_, reject) => {
    timer = window.setInterval(() => {
      if (token !== generation) {
        window.clearInterval(timer)
        reject(new AsrCancelled())
      }
    }, 400)
  })
  try {
    return await Promise.race([work, cancelled])
  } finally {
    window.clearInterval(timer)
  }
}

export async function transcribeJapanese(input: Float32Array | Blob, onStatus: (message: string) => void): Promise<{ text: string; truncated: boolean }> {
  const token = generation
  let samples: Float32Array
  if (input instanceof Float32Array) {
    if (input.length < 1600) throw new AsrError('decode', 'short')
    samples = input
  } else {
    try {
      samples = await blobTo16k(input)
    } catch (error) {
      throw error instanceof AsrCancelled ? error : classify(error)
    }
  }
  if (token !== generation) throw new AsrCancelled()
  const max = 16000 * 90
  const truncated = samples.length > max
  const audio = truncated ? samples.slice(0, max) : samples
  const transcriber = await loadModel(onStatus, token)
  if (token !== generation) throw new AsrCancelled()
  onStatus('正在本机识别，声音不会离开这台设备…')
  let output: { text?: string } | string
  try {
    output = await withCancel(transcriber(audio, {
      language: 'japanese',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    }), token)
  } catch (error) {
    if (error instanceof AsrCancelled) throw error
    throw classify(error)
  }
  if (token !== generation) throw new AsrCancelled()
  let text = asText(output)
  if (HALLUCINATION.test(text)) text = ''
  return { text, truncated }
}
