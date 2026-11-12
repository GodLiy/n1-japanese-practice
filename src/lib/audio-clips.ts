import { audioClips } from '../content/audio-manifest.ts'

export function clipKey(slot: number, text: string): string {
  return `${slot % 2}\n${text}`
}

export function clipFile(slot: number, text: string): string | null {
  return audioClips[clipKey(slot, text)] ?? null
}

export function clipUrl(file: string): string {
  const base = import.meta.env.BASE_URL || './'
  return new URL(file, new URL(base, document.baseURI)).href
}
