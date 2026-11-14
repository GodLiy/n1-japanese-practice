import assert from 'node:assert/strict'
import { applyOrtRuntime, filePathFromCacheKey } from '../src/lib/asr-runtime.ts'

const revision = '36050c46d777d46dc4b5f43f6d90574fc38f8732'
const remote = `https://huggingface.co/onnx-community/whisper-small/resolve/${revision}/onnx/decoder_model_merged_quantized.onnx`
assert.equal(filePathFromCacheKey(remote), 'onnx/decoder_model_merged_quantized.onnx')
assert.equal(filePathFromCacheKey('/models/onnx-community/whisper-small/config.json'), 'config.json')
assert.equal(filePathFromCacheKey('/models/onnx-community/whisper-small/onnx/encoder_model_quantized.onnx'), 'onnx/encoder_model_quantized.onnx')
assert.equal(filePathFromCacheKey('https://example.com/other.bin'), null)
assert.equal(filePathFromCacheKey('/models/onnx-community/whisper-small/../secret'), null)

const href = 'https://example.com/assets/ort-wasm-simd-threaded.jsep-abc.wasm'
const bytes = new Uint8Array([1, 2, 3])

const phone = {}
applyOrtRuntime(phone, { href, bytes }, true)
assert.equal(phone.proxy, false)
assert.equal(phone.numThreads, 1)
assert.equal(phone.wasmBinary, bytes)
assert.equal(phone.wasmPaths, undefined)

const desktop = { wasmPaths: 'https://cdn.jsdelivr.net/npm/old/' }
applyOrtRuntime(desktop, { href, bytes }, false)
assert.equal(desktop.proxy, false)
assert.equal(desktop.wasmBinary, bytes)
assert.equal(desktop.wasmPaths, undefined)

const split = {}
applyOrtRuntime(split, { href: '', bytes }, false)
assert.equal(split.proxy, false)
assert.equal(split.wasmBinary, bytes)

const dev = { wasmPaths: 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/' }
applyOrtRuntime(dev, { href: '', bytes: null }, false)
assert.equal(dev.proxy, true)
assert.equal(dev.wasmBinary, undefined)
assert.equal(dev.wasmPaths, undefined)

console.log('asr runtime checks passed')
