import { plain } from './ruby.ts'

const PUNCTUATION = /[\s\u3000、。！？!?．，,.「」『』（）()【】[\]・…―—\-〜～~：:；;""“”‘’'`･·]/g

export function kataToHira(input: string): string {
  return input.replace(/[\u30a1-\u30f6]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
}

export function normalizeJa(input: string): string {
  return kataToHira(plain(input).normalize('NFKC')).replace(PUNCTUATION, '')
}

function cap(chars: string[]): string[] {
  return chars.length > 500 ? chars.slice(0, 500) : chars
}

function levenshtein(a: string[], b: string[]): number {
  const n = a.length
  const m = b.length
  const row = Array.from({ length: m + 1 }, (_, j) => j)
  for (let i = 1; i <= n; i++) {
    let prev = row[0]
    row[0] = i
    for (let j = 1; j <= m; j++) {
      const temp = row[j]
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, prev + cost)
      prev = temp
    }
  }
  return row[m]
}

export function similarity(target: string, heard: string): number {
  const a = cap([...normalizeJa(target)])
  const b = cap([...normalizeJa(heard)])
  if (!a.length || !b.length) return 0
  const dist = levenshtein(a, b)
  const denom = Math.max(a.length, b.length)
  return Math.max(0, Math.min(100, Math.round((1 - dist / denom) * 100)))
}

export type DiffPiece = { text: string; kind: 'ok' | 'bad' }

export function alignJa(target: string, heard: string): { target: DiffPiece[]; heard: DiffPiece[] } {
  const a = cap([...normalizeJa(target)])
  const b = cap([...normalizeJa(heard)])
  const n = a.length
  const m = b.length
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array<number>(m + 1).fill(0))
  for (let i = 0; i <= n; i++) dp[i][0] = i
  for (let j = 0; j <= m; j++) dp[0][j] = j
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost)
    }
  }
  const targetChars: { ch: string; kind: 'ok' | 'bad' }[] = []
  const heardChars: { ch: string; kind: 'ok' | 'bad' }[] = []
  let i = n
  let j = m
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1] && dp[i][j] === dp[i - 1][j - 1]) {
      targetChars.push({ ch: a[i - 1], kind: 'ok' })
      heardChars.push({ ch: b[j - 1], kind: 'ok' })
      i -= 1
      j -= 1
    } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
      targetChars.push({ ch: a[i - 1], kind: 'bad' })
      heardChars.push({ ch: b[j - 1], kind: 'bad' })
      i -= 1
      j -= 1
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      targetChars.push({ ch: a[i - 1], kind: 'bad' })
      i -= 1
    } else {
      heardChars.push({ ch: b[j - 1], kind: 'bad' })
      j -= 1
    }
  }
  targetChars.reverse()
  heardChars.reverse()
  return { target: groupChars(targetChars), heard: groupChars(heardChars) }
}

function groupChars(parts: { ch: string; kind: 'ok' | 'bad' }[]): DiffPiece[] {
  const out: DiffPiece[] = []
  for (const part of parts) {
    const prev = out[out.length - 1]
    if (prev && prev.kind === part.kind) prev.text += part.ch
    else out.push({ text: part.ch, kind: part.kind })
  }
  return out
}

export function scoreBand(score: number): { title: string; detail: string } {
  if (score >= 90) return { title: '非常接近', detail: '字面已经很贴。可以再听一次，把句尾的轻重对齐。' }
  if (score >= 75) return { title: '大体对上', detail: '主干在。红色的地方拆出来，单独再说一遍。' }
  if (score >= 60) return { title: '只对上一部分', detail: '先跟半句。识别用了别的汉字时，可以只改误转换再评分。' }
  return { title: '还差一截', detail: '先听慢速，影子跟读半句，再连成整段。' }
}

export function listenBand(score: number): string {
  if (score >= 100) return '这三问都站住了。下一篇可以专门听说话人最后想要对方做什么。'
  if (score >= 60) return '大意有了。错的那一问，多半是被句中一个显眼的词带走了。'
  if (score >= 30) return '听到了碎片。先看解释里被否定的那一项，再把音频听一遍。'
  return '先别对答案。再听一遍，只追一个问题：说话人最后想留下什么。'
}

export type RoleScore = {
  score: number
  hits: boolean[]
  matched: (string | null)[]
  overlap: number
}

export function scoreRole(
  heard: string,
  points: { keywords: string[] }[],
  references: string[],
): RoleScore {
  const normalized = normalizeJa(heard)
  if (!normalized) {
    return {
      score: 0,
      hits: points.map(() => false),
      matched: points.map(() => null),
      overlap: 0,
    }
  }
  const matched = points.map((point) => point.keywords.find((keyword) => normalized.includes(normalizeJa(keyword))) ?? null)
  const hits = matched.map((keyword) => keyword !== null)
  const covered = points.length ? hits.filter(Boolean).length / points.length : 0
  const overlap = references.length ? Math.max(...references.map((reference) => similarity(reference, heard))) : 0
  const score = Math.round((0.75 * covered + 0.25 * (overlap / 100)) * 100)
  return { score, hits, matched, overlap }
}

export function roleFeedback(hits: boolean[]): string {
  const missed = hits.filter((hit) => !hit).length
  if (hits.length === 0) return '对照下面的参考答案听一遍结构。'
  if (missed === 0) return '要点都覆盖到了。再听参考答案，把语尾的轻重对齐，不必背原文。'
  if (missed === 1) return '还缺一个要点。看没亮的那一条，用自己的句子补上。'
  return '缺的要点比较多。先按参考答案的顺序说：结论、理由、你能交出的东西。'
}
