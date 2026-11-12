import { dictionary } from '../content/dictionary.ts'
import type { DictEntry } from '../types.ts'

export type Token = { text: string; entry: DictEntry | null }

type Index = {
  map: Map<string, DictEntry>
  max: number
}

let cache: Index | null = null

function buildIndex(): Index {
  const map = new Map<string, DictEntry>()
  let max = 1
  for (const entry of dictionary) {
    for (const surface of [entry.word, ...(entry.forms ?? [])]) {
      if (!surface) continue
      const prev = map.get(surface)
      if (!prev || entry.word.length > prev.word.length) map.set(surface, entry)
      if (surface.length > max) max = surface.length
    }
  }
  return { map, max }
}

function index(): Index {
  if (!cache) cache = buildIndex()
  return cache
}

const WORD = /[\u3040-\u30ff\u4e00-\u9fff\u3400-\u4dbf々〆ヵヶ]/

export function lookupSurface(surface: string): DictEntry | null {
  return index().map.get(surface) ?? null
}

export function tokenize(text: string): Token[] {
  const { map, max } = index()
  const out: Token[] = []
  let i = 0
  while (i < text.length) {
    const char = text[i] ?? ''
    if (!WORD.test(char)) {
      let j = i + 1
      while (j < text.length && !WORD.test(text[j] ?? '')) j += 1
      out.push({ text: text.slice(i, j), entry: null })
      i = j
      continue
    }
    let found: { len: number; entry: DictEntry } | null = null
    const limit = Math.min(max, text.length - i)
    for (let len = limit; len >= 1; len -= 1) {
      const entry = map.get(text.slice(i, i + len))
      if (entry) {
        found = { len, entry }
        break
      }
    }
    if (found) {
      out.push({ text: text.slice(i, i + found.len), entry: found.entry })
      i += found.len
      continue
    }
    let j = i + 1
    while (j < text.length && WORD.test(text[j] ?? '')) {
      const limitAt = Math.min(max, text.length - j)
      let hit = false
      for (let len = 1; len <= limitAt; len += 1) {
        if (map.has(text.slice(j, j + len))) {
          hit = true
          break
        }
      }
      if (hit) break
      j += 1
    }
    out.push({ text: text.slice(i, j), entry: null })
    i = j
  }
  return out
}

export function resetDictionaryIndex(): void {
  cache = null
}
