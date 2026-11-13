import { SITE_MIRROR_BASES } from './asr-pack.ts'
import { asBlob, concatBytes, sha256Hex } from './bytes.ts'

type ApkManifest = { name: string; sha256: string; bytes: number; parts: string[] }

export async function downloadMirroredApk(onStatus: (message: string) => void): Promise<void> {
  let manifest: ApkManifest | null = null
  let base = ''
  for (const candidate of SITE_MIRROR_BASES) {
    try {
      const response = await fetch(`${candidate}apk/manifest.json`)
      if (!response.ok) continue
      manifest = await response.json() as ApkManifest
      base = candidate
      break
    } catch {
      continue
    }
  }
  if (!manifest) throw new Error('missing')
  const chunks: Uint8Array[] = []
  let got = 0
  for (const part of manifest.parts) {
    const response = await fetch(`${base}${part}`)
    if (!response.ok) throw new Error('part')
    const bytes = new Uint8Array(await response.arrayBuffer())
    chunks.push(bytes)
    got += bytes.byteLength
    onStatus(`正在从国内镜像下载安装包 ${Math.round((100 * got) / manifest.bytes)}%。`)
  }
  const file = concatBytes(chunks)
  if (file.byteLength !== manifest.bytes || await sha256Hex(file) !== manifest.sha256) throw new Error('checksum')
  const link = document.createElement('a')
  link.href = URL.createObjectURL(asBlob(file))
  link.download = manifest.name
  link.click()
  onStatus(`已开始保存 ${manifest.name}。校验通过，可以覆盖安装。`)
}
