import { writeFileSync } from 'node:fs'
import { articles } from '../src/content/articles.ts'
import { dictionary } from '../src/content/dictionary.ts'
import { listeningItems } from '../src/content/listening.ts'
import { readSets } from '../src/content/readaloud.ts'
import { roleScenarios } from '../src/content/roleplay.ts'
import { shadowPassages } from '../src/content/shadowing.ts'
import { plain } from '../src/lib/ruby.ts'
import { splitSentences } from '../src/lib/sentences.ts'

type Row = { slot: number; text: string }

const rows: Row[] = []
const seen = new Set<string>()

function add(text: string, slot: number) {
  const voice = ((slot % 2) + 2) % 2
  for (const sentence of splitSentences(plain(text))) {
    const key = `${voice}\n${sentence}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({ slot: voice, text: sentence })
  }
}

for (const item of listeningItems) {
  const slots = new Map<string, number>()
  let next = 0
  for (const line of item.lines) {
    let slot = 0
    if (line.speaker) {
      if (!slots.has(line.speaker)) slots.set(line.speaker, next++)
      slot = slots.get(line.speaker) ?? 0
    }
    add(line.text, slot)
  }
}
for (const item of shadowPassages) {
  for (const chunk of item.chunks) add(chunk.spoken, 0)
}
for (const item of roleScenarios) {
  add(item.counterpart, 1)
  add(item.model, 0)
}
for (const set of readSets) {
  for (const sentence of set.sentences) add(sentence.text, 0)
}
for (const article of articles) {
  for (const paragraph of article.paragraphs) add(paragraph, 0)
}
for (const entry of dictionary) add(entry.word, 0)

const target = process.argv[2] ?? '/tmp/spoken.json'
writeFileSync(target, JSON.stringify(rows))
console.error(`rows ${rows.length}`)
