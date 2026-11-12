import { createContext } from 'react'

export type SpeakLine = { text: string; slot?: number; speaker?: string }

export type SpeechValue = {
  speaking: boolean
  activeToken: number
  activeSpeaker: string | null
  voiceLabel: string
  voiceNote: string
  error: string | null
  supported: boolean
  speak: (lines: SpeakLine[], rate: number) => number
  stop: () => void
}

export const SpeechContext = createContext<SpeechValue | null>(null)
