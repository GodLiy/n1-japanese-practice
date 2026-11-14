import { ASR_MODEL_ID } from './asr-pack.ts'

export type OrtWasmTarget = {
  href: string
  bytes: Uint8Array<ArrayBuffer> | null
}

export type WasmEnv = {
  numThreads?: number
  proxy?: boolean
  simd?: boolean
  wasmPaths?: string | { wasm?: string | URL }
  wasmBinary?: Uint8Array
}

const MODEL_MARK = `${ASR_MODEL_ID}/`

/** Cache keys are either the Hugging Face URL or Transformers' local `/models/...` path. */
export function filePathFromCacheKey(key: string): string | null {
  const at = key.indexOf(MODEL_MARK)
  if (at < 0) return null
  let rest = key.slice(at + MODEL_MARK.length).replace(/^resolve\/[^/]+\//, '')
  rest = rest.split('?')[0]?.split('#')[0] ?? ''
  if (!rest || rest.startsWith('/') || rest.includes('..')) return null
  return rest
}

/**
 * A string `wasmPaths` is a directory prefix, so a file URL must not be stored there.
 * The packaged worker also crashes with `document is not defined`, so verified bytes
 * always run on the page thread.
 */
export function applyOrtRuntime(wasm: WasmEnv, runtime: OrtWasmTarget, pageThread: boolean): void {
  wasm.numThreads = 1
  if (runtime.bytes) {
    wasm.proxy = false
    wasm.wasmBinary = runtime.bytes
    wasm.wasmPaths = undefined
    return
  }
  wasm.wasmBinary = undefined
  wasm.proxy = !pageThread
  wasm.wasmPaths = runtime.href ? { wasm: runtime.href } : undefined
}
