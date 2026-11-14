export function concatBytes(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const total = parts.reduce((sum, part) => sum + part.byteLength, 0)
  const buffer = new ArrayBuffer(total)
  const out = new Uint8Array(buffer)
  let offset = 0
  for (const part of parts) {
    out.set(part, offset)
    offset += part.byteLength
  }
  return out
}

export function asBlob(bytes: Uint8Array): Blob {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return new Blob([copy])
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const whole = bytes.byteOffset === 0 && bytes.byteLength === bytes.buffer.byteLength
  const source = whole ? bytes.buffer : bytes.slice().buffer
  const digest = await crypto.subtle.digest('SHA-256', source as ArrayBuffer)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
