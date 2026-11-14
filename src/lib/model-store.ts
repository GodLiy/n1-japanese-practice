import { concatBytes, sha256Hex } from './bytes.ts'

const DB_NAME = 'chowa-asr'
const DB_VERSION = 1
const CHUNK = 8 * 1024 * 1024

type Meta = { path: string; sha256: string; bytes: number; chunks: number }
type MemoryFile = { sha256: string; bytes: Uint8Array }

const memory = new Map<string, MemoryFile>()
let database: Promise<IDBDatabase> | null = null
let durable = true

export function rememberedModelFile(path: string): MemoryFile | null {
  return memory.get(path) ?? null
}

export function rememberModelFile(path: string, sha256: string, bytes: Uint8Array): void {
  memory.set(path, { sha256, bytes })
}

export function markModelStored(saved: boolean): void {
  if (!saved) durable = false
}

export function releaseRememberedModel(): void {
  if (durable) memory.clear()
}

export async function readModelFile(path: string): Promise<{ sha256: string; bytes: Uint8Array<ArrayBuffer> } | null> {
  if (!canStore()) return null
  try {
    const db = await openDb()
    const meta = await requestResult<Meta | undefined>(db.transaction('meta').objectStore('meta').get(path))
    if (!meta || meta.chunks < 1) return null
    const parts: Uint8Array[] = []
    const tx = db.transaction('chunks')
    for (let index = 0; index < meta.chunks; index += 1) {
      const chunk = await requestResult<ArrayBuffer | undefined>(tx.objectStore('chunks').get(`${path}#${index}`))
      if (!chunk) return null
      parts.push(new Uint8Array(chunk))
    }
    const bytes = concatBytes(parts)
    if (bytes.byteLength !== meta.bytes || await sha256Hex(bytes) !== meta.sha256) {
      await deleteModelFile(path)
      return null
    }
    return { sha256: meta.sha256, bytes }
  } catch {
    return null
  }
}

export async function writeModelFile(path: string, sha256: string, bytes: Uint8Array): Promise<boolean> {
  if (!canStore()) return false
  try {
    const db = await openDb()
    const previous = await requestResult<Meta | undefined>(db.transaction('meta').objectStore('meta').get(path))
    const tx = db.transaction(['meta', 'chunks'], 'readwrite')
    const metaStore = tx.objectStore('meta')
    const chunkStore = tx.objectStore('chunks')
    if (previous) {
      for (let index = 0; index < previous.chunks; index += 1) chunkStore.delete(`${path}#${index}`)
    }
    const count = Math.max(1, Math.ceil(bytes.byteLength / CHUNK))
    for (let index = 0; index < count; index += 1) {
      const piece = bytes.slice(index * CHUNK, Math.min((index + 1) * CHUNK, bytes.byteLength))
      chunkStore.put(piece.buffer, `${path}#${index}`)
    }
    metaStore.put({ path, sha256, bytes: bytes.byteLength, chunks: count } satisfies Meta)
    await transactionDone(tx)
    return true
  } catch {
    database = null
    return false
  }
}

export async function deleteModelFile(path: string): Promise<void> {
  if (!canStore()) return
  try {
    const db = await openDb()
    const previous = await requestResult<Meta | undefined>(db.transaction('meta').objectStore('meta').get(path))
    const tx = db.transaction(['meta', 'chunks'], 'readwrite')
    tx.objectStore('meta').delete(path)
    const chunks = previous?.chunks ?? 0
    for (let index = 0; index < chunks; index += 1) tx.objectStore('chunks').delete(`${path}#${index}`)
    await transactionDone(tx)
  } catch {
    database = null
  }
}

function canStore(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (database) return database
  database = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'path' })
      if (!db.objectStoreNames.contains('chunks')) db.createObjectStore('chunks')
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('idb'))
  })
  database.catch(() => {
    database = null
  })
  return database
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('idb'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('idb'))
    tx.onabort = () => reject(tx.error ?? new Error('idb'))
  })
}
