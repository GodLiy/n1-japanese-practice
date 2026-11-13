import { isNativeApp } from './device.ts'
import { blobTo16k } from './audio-local.ts'

const WEB_MODEL = 'onnx-community/whisper-base'
const APP_MODEL = 'onnx-community/whisper-tiny'

export function localAsrModel(): string {
  return isNativeApp() ? APP_MODEL : WEB_MODEL
}

export const LOCAL_ASR_NOTE = '浏览器里的模型约 80MB，另有约 22MB 的运行库。手机应用用较小的模型，约 40MB。只在第一次下载，之后留在这台设备里。可以取消。录音不会上传。'

const HALLUCINATION = /^(ご視聴ありがとうございました|字幕制作|字幕作成|ありがとうございました|お願いします)[。！…\s]*$/
const STALL_MS = 45000

type Transcriber = (
  audio: Float32Array,
  options: { language: string; task: string; chunk_length_s: number; stride_length_s: number },
) => Promise<{ text?: string } | string>

type Progress = { status?: string; file?: string; progress?: number }

type LoadResult = { transcriber: Transcriber; model: string }

let loading: Promise<LoadResult> | null = null
let ready: LoadResult | null = null
let generation = 0
let lastBeat = 0

export class AsrCancelled extends Error {
  constructor() {
    super('cancelled')
    this.name = 'AsrCancelled'
  }
}

export function cancelModelLoad(): void {
  generation += 1
  loading = null
}

function asText(output: { text?: string } | string): string {
  const raw = typeof output === 'string' ? output : output.text ?? ''
  return raw.replace(/\s+/g, ' ').trim()
}

function beat(): void {
  lastBeat = Date.now()
}

async function createPipeline(model: string, onStatus: (message: string) => void, token: number, proxy: boolean): Promise<Transcriber> {
  const { pipeline, env } = await import('@huggingface/transformers')
  env.allowLocalModels = false
  env.useBrowserCache = true
  const wasm = env.backends.onnx.wasm as { numThreads?: number; proxy?: boolean }
  wasm.numThreads = 1
  wasm.proxy = proxy
  beat()
  const transcriber = await pipeline('automatic-speech-recognition', model, {
    dtype: 'q8',
    device: 'wasm',
    progress_callback: (info: Progress) => {
      if (token !== generation) return
      beat()
      const file = info.file ? ` ${info.file}` : ''
      if (info.status === 'progress' && typeof info.progress === 'number') {
        onStatus(`正在下载本机识别模型 ${Math.round(info.progress)}%${file}。可以取消，句子也能先打在下面。`)
      } else if (info.status === 'initiate') {
        onStatus('正在下载本机日语识别模型…可以取消。')
      } else if (info.status === 'done' || info.status === 'ready') {
        onStatus('模型已在本机，正在识别…')
      }
    },
  })
  return transcriber as Transcriber
}

function loadModel(onStatus: (message: string) => void, token: number): Promise<LoadResult> {
  if (ready && token === generation) return Promise.resolve(ready)
  if (loading && token === generation) return loading
  const model = localAsrModel()
  beat()
  onStatus('正在准备本机日语识别模型…可以取消，句子也能先打在下面。')
  let settled = false
  loading = new Promise<LoadResult>((resolve, reject) => {
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
        reject(new Error('timeout'))
      }
    }, 2000)
    const finish = (result: LoadResult) => {
      ready = result
      if (settled || token !== generation) return
      settled = true
      window.clearInterval(timer)
      resolve(result)
    }
    const fail = (error: unknown) => {
      if (loading && token === generation) loading = null
      if (settled) return
      settled = true
      window.clearInterval(timer)
      reject(error)
    }
    const adopt = (transcriber: Transcriber) => finish({ transcriber, model })
    void createPipeline(model, onStatus, token, true)
      .then(adopt)
      .catch((error: unknown) => {
        if (token !== generation || isNativeApp()) {
          fail(token !== generation ? new AsrCancelled() : error)
          return
        }
        onStatus('正在换一种方式准备模型…')
        void createPipeline(model, onStatus, token, false).then(adopt).catch(fail)
      })
  })
  return loading
}

export async function transcribeJapanese(blob: Blob, onStatus: (message: string) => void): Promise<{ text: string; truncated: boolean }> {
  const token = generation
  const samples = await blobTo16k(blob)
  if (token !== generation) throw new AsrCancelled()
  const max = 16000 * 90
  const truncated = samples.length > max
  const audio = truncated ? samples.slice(0, max) : samples
  onStatus('正在本机识别，声音不会离开这台设备…')
  const { transcriber } = await loadModel(onStatus, token)
  if (token !== generation) throw new AsrCancelled()
  const output = await transcriber(audio, {
    language: 'japanese',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  })
  if (token !== generation) throw new AsrCancelled()
  let text = asText(output)
  if (HALLUCINATION.test(text)) text = ''
  return { text, truncated }
}
