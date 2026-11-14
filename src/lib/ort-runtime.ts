import { type OrtWasmTarget } from './asr-runtime.ts'
import { concatBytes, sha256Hex } from './bytes.ts'

type RuntimeManifest = { file: string; sha256: string; bytes: number; parts?: string[] }

const EMPTY: OrtWasmTarget = { href: '', bytes: null }

/** Load the packaged runtime and check it. Bytes avoid a second fetch with a broken path. */
export async function loadOrtRuntime(): Promise<OrtWasmTarget> {
  let manifest: RuntimeManifest
  try {
    const response = await fetch(new URL('ort-runtime.json', document.baseURI))
    if (!response.ok) return EMPTY
    manifest = await response.json() as RuntimeManifest
  } catch {
    return EMPTY
  }
  if (!manifest?.file || !manifest.sha256 || !manifest.bytes) return EMPTY
  const sources = manifest.parts?.length ? manifest.parts : [manifest.file]
  const chunks: Uint8Array[] = []
  for (const part of sources) {
    const response = await fetch(new URL(part, document.baseURI))
    if (!response.ok) throw new Error('runtime wasm')
    chunks.push(new Uint8Array(await response.arrayBuffer()))
  }
  const bytes = concatBytes(chunks)
  if (bytes.byteLength !== manifest.bytes || await sha256Hex(bytes) !== manifest.sha256) throw new Error('runtime checksum')
  const href = manifest.parts?.length ? '' : new URL(manifest.file, document.baseURI).href
  return { href, bytes }
}
