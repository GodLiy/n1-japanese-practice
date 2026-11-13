import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'

const apkPath = process.argv[2]
const dest = process.argv[3]
const partSize = 12 * 1024 * 1024
if (!apkPath || !dest) throw new Error('usage: publish-apk-parts.mjs <apk> <dest>')

const bytes = await readFile(apkPath)
const parts = []
await mkdir(dest, { recursive: true })
for (let offset = 0, index = 0; offset < bytes.length; offset += partSize, index += 1) {
  const name = `${basename(apkPath)}.part${String(index).padStart(2, '0')}`
  await writeFile(join(dest, name), bytes.subarray(offset, Math.min(offset + partSize, bytes.length)))
  parts.push(name)
}
const manifest = {
  name: basename(apkPath),
  sha256: createHash('sha256').update(bytes).digest('hex'),
  bytes: bytes.length,
  parts,
}
await writeFile(join(dest, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log(JSON.stringify(manifest))
