import { blobTo16k } from './audio-local.ts'

export const LOCAL_ASR_MODEL = 'onnx-community/whisper-base'
export const LOCAL_ASR_NOTE = '模型约 80MB，另有约 22MB 的本机运行库，只在第一次使用时下载，之后留在这台浏览器里。录音不会上传。'

const HALLUCINATION = /^(ご視聴ありがとうございました|字幕制作|字幕作成|ありがとうございました|お願いします)[。！…\s]*$/

type Transcriber = (
  audio: Float32Array,
  options: { language: string; task: string; chunk_length_s: number; stride_length_s: number },
) => Promise<{ text?: string } | string>

type Progress = { status?: string; progress?: number }

let loading: Promise<Transcriber> | null = null

function asText(output: { text?: string } | string): string {
  const raw = typeof output === 'string' ? output : output.text ?? ''
  return raw.replace(/\s+/g, ' ').trim()
}

async function loadModel(onStatus: (message: string) => void): Promise<Transcriber> {
  if (!loading) {
    loading = (async () => {
      onStatus('正在准备本机日语识别模型…')
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      env.useBrowserCache = true
      const wasm = env.backends.onnx.wasm as { numThreads?: number } | undefined
      if (wasm) wasm.numThreads = 1
      const transcriber = await pipeline('automatic-speech-recognition', LOCAL_ASR_MODEL, {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: (info: Progress) => {
          if (info.status === 'progress' && typeof info.progress === 'number') {
            onStatus(`正在下载本机识别模型 ${Math.round(info.progress)}%（${LOCAL_ASR_NOTE}）`)
          } else if (info.status === 'initiate') {
            onStatus('正在下载本机日语识别模型…')
          } else if (info.status === 'done' || info.status === 'ready') {
            onStatus('模型已在本机，正在识别…')
          }
        },
      })
      return transcriber as Transcriber
    })().catch((error: unknown) => {
      loading = null
      throw error
    })
  }
  return loading
}

export async function transcribeJapanese(blob: Blob, onStatus: (message: string) => void): Promise<{ text: string; truncated: boolean }> {
  const samples = await blobTo16k(blob)
  const max = 16000 * 90
  const truncated = samples.length > max
  const audio = truncated ? samples.slice(0, max) : samples
  onStatus('正在本机识别，声音不会离开这台设备…')
  const transcriber = await loadModel(onStatus)
  const output = await transcriber(audio, {
    language: 'japanese',
    task: 'transcribe',
    chunk_length_s: 30,
    stride_length_s: 5,
  })
  let text = asText(output)
  if (HALLUCINATION.test(text)) text = ''
  return { text, truncated }
}
