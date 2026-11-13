import { readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = process.argv[2]
const limit = Number(process.argv[3] ?? 19_000_000)
const partSize = 9_000_000
if (!root) throw new Error('usage: split-large.mjs <directory> [limit]')

async function walk(dir) {
  const found = []
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) found.push(...await walk(path))
    else found.push(path)
  }
  return found
}

const split = new Map()
for (const file of await walk(root)) {
  const info = await stat(file)
  if (info.size <= limit) continue
  const rel = relative(root, file).split('\\').join('/')
  const bytes = await readFile(file)
  const parts = []
  for (let offset = 0, index = 0; offset < bytes.length; offset += partSize, index += 1) {
    const name = `${rel}.part${String(index).padStart(2, '0')}`
    await writeFile(join(root, name), bytes.subarray(offset, Math.min(offset + partSize, bytes.length)))
    parts.push(name)
  }
  await rm(file)
  split.set(rel, parts)
  console.log(`split ${rel} into ${parts.length} parts`)
}

const manifestPath = join(root, 'ort-runtime.json')
try {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (split.has(manifest.file)) {
    manifest.parts = split.get(manifest.file)
    await writeFile(manifestPath, JSON.stringify(manifest))
    console.log('updated ort-runtime.json')
  }
} catch {
  // A dev build may not have written the runtime manifest.
}
