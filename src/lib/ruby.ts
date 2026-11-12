export type Segment = { t: string; r?: string }

function rubyPattern(): RegExp {
  return /\[\[([^[\]|]+)\|([^[\]]+)\]\]/g
}

export function parseRuby(input: string): Segment[] {
  const segments: Segment[] = []
  const pattern = rubyPattern()
  let last = 0
  for (const match of input.matchAll(pattern)) {
    const index = match.index ?? 0
    if (index > last) segments.push({ t: input.slice(last, index) })
    segments.push({ t: match[1] ?? '', r: match[2] })
    last = index + match[0].length
  }
  if (last < input.length) segments.push({ t: input.slice(last) })
  return segments.filter((segment) => segment.t.length > 0)
}

export function plain(input: string): string {
  return input.replace(rubyPattern(), '$1')
}
