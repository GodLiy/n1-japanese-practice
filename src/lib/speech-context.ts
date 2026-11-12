import { createContext } from 'react'

export type SpeakLine = { text: string; slot?: number }

export type SpeechValue = {
  speaking: boolean
  activeToken: number
  voiceLabel: string
  error: string | null
  supported: boolean
  speak: (lines: SpeakLine[], rate: number) => number
  stop: () => void
}

export const SpeechContext = createContext<SpeechValue | null>(null)
