import { asBlob, concatBytes, sha256Hex } from './bytes.ts'

type RuntimeManifest = { file: string; sha256: string; bytes: number; parts?: string[] }

/** Use the packaged runtime when it is one file. Mirror hosts split the file so a CDN can serve it. */
export async function resolveOrtWasm(): Promise<string> {
  let manifest: RuntimeManifest
  try {
    const response = await fetch(new URL('ort-runtime.json', document.baseURI))
    if (!response.ok) return ''
    manifest = await response.json() as RuntimeManifest
  } catch {
    return ''
  }
  if (!manifest.parts?.length) return new URL(manifest.file, document.baseURI).href
  const chunks: Uint8Array[] = []
  for (const part of manifest.parts) {
    const response = await fetch(new URL(part, document.baseURI))
    if (!response.ok) throw new Error('runtime part')
    chunks.push(new Uint8Array(await response.arrayBuffer()))
  }
  const bytes = concatBytes(chunks)
  if (bytes.byteLength !== manifest.bytes || await sha256Hex(bytes) !== manifest.sha256) throw new Error('runtime checksum')
  return URL.createObjectURL(asBlob(bytes))
}
