import { blobTo16k, DecodeError } from './audio-local.ts'

/** Same Whisper base model on the website and in the Android app. */
export const LOCAL_ASR_MODEL = 'onnx-community/whisper-base'
export const LOCAL_ASR_NOTE = '手机和浏览器用同一个日语模型，大约 80MB，另有约 22MB 运行库。只在第一次下载，之后留在这台设备里。下载时可以取消，页面不会被卡住。录音不会上传。'

const HALLUCINATION = /^(ご視聴ありがとうございました|字幕制作|字幕作成|ご視聴ありがとう)[。！…\s]*$/
const STALL_MS = 90000

type Transcriber = (
  audio: Float32Array,
  options: { language: string; task: string; chunk_length_s: number; stride_length_s: number },
) => Promise<{ text?: string } | string>

type Progress = { status?: string; file?: string; progress?: number; loaded?: number; total?: number }

type WasmEnv = {
  numThreads?: number
  proxy?: boolean
  simd?: boolean
  wasmPaths?: string | { wasm?: string | URL }
}

export class AsrCancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'AsrCancelled'
  }
}

export type AsrKind = 'download' | 'runtime' | 'decode' | 'timeout' | 'recognize'

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

export function cancelModelLoad(): void {
  generation += 1
  loading = null
}

export function asrFailureMessage(error: unknown): string {
  const failure = error instanceof AsrError ? error : classify(error)
  const reload = failure instanceof Error && /initWasm|previous call/i.test(failure.message)
  if (failure.kind === 'timeout') return '模型下载停住了，已经放开这个页面。声音没有上传。可以再试，或把句子打在下面。'
  if (failure.kind === 'download') return '模型没有下载完。请检查网络后再点一次说话。声音没有上传。句子也可以打在下面。'
  if (failure.kind === 'decode') return '录音已经留下，但这台设备读不了这种格式。请再点一次说话。声音没有上传。'
  if (failure.kind === 'runtime' && reload) return '本机识别没有启动。请重新打开这个页面，再点一次说话。声音没有上传。'
  if (failure.kind === 'runtime') return '本机识别没有启动。可以再点一次说话。声音没有上传。句子也可以打在下面。'
  return '听到了声音，但识别没有完成。可以再点一次说话，或把句子打在下面。声音没有上传。'
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
  if (/Failed to fetch|NetworkError|network|huggingface|404|403|504/i.test(message)) return new AsrError('download', message)
  if (/wasm|worker|onnx|backend|initWasm|SharedArray|no available backend/i.test(message)) return new AsrError('runtime', message)
  return new AsrError('recognize', message)
}

async function createPipeline(onStatus: (message: string) => void, token: number): Promise<Transcriber> {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  env.useBrowserCache = true
  const wasm = env.backends.onnx.wasm as WasmEnv
  wasm.numThreads = 1
  wasm.simd = true
  // Run recognition in a worker. Clear the CDN path so the worker uses the
  // runtime file shipped with this site, not a third-party host.
  wasm.proxy = true
  wasm.wasmPaths = ''
  beat()
  const transcriber = await pipeline('automatic-speech-recognition', LOCAL_ASR_MODEL, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (info: Progress) => {
      if (token !== generation) return
      beat()
      if (info.status === 'progress') {
        const percent = typeof info.progress === 'number'
          ? info.progress
          : info.total
            ? (100 * (info.loaded ?? 0)) / info.total
            : null
        if (percent == null) return
        const shown = Math.round(percent)
        if (shown === lastPercent) return
        lastPercent = shown
        const file = info.file ? ` ${info.file}` : ''
        onStatus(`正在下载本机识别模型 ${shown}%${file}。可以取消，句子也能先打在下面。`)
        return
      }
      if (info.status === 'initiate') onStatus('正在下载本机日语识别模型…可以取消。')
      else if (info.status === 'ready') onStatus('模型已在本机，正在识别…')
    },
  })
  return transcriber as Transcriber
}

function loadModel(onStatus: (message: string) => void, token: number): Promise<Transcriber> {
  if (ready && token === generation) return Promise.resolve(ready)
  if (loading && token === generation) return loading
  beat()
  lastPercent = -1
  onStatus('正在准备本机日语识别模型…可以取消，句子也能先打在下面。')
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
      ready = transcriber
      if (settled || token !== generation) return
      settled = true
      window.clearInterval(timer)
      resolve(transcriber)
    }
    const fail = (error: unknown) => {
      if (loading && token === generation) loading = null
      if (settled) return
      settled = true
      window.clearInterval(timer)
      reject(error instanceof AsrCancelled ? error : classify(error))
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
