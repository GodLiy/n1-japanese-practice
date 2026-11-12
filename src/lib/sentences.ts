export function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？])/)
    .map((part) => part.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const part of parts.length ? parts : [text.trim()]) {
    if (!part) continue
    if (part.length <= 180) {
      out.push(part)
      continue
    }
    const bits = part.split(/(?<=、)/)
    let buffer = ''
    for (const bit of bits) {
      if ((buffer + bit).length > 160 && buffer) {
        out.push(buffer)
        buffer = bit
      } else {
        buffer += bit
      }
    }
    if (buffer) out.push(buffer)
  }
  return out.filter(Boolean)
}
