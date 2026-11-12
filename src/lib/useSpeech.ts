import { useContext } from 'react'
import { SpeechContext } from './speech-context.ts'

export function useSpeech() {
  const value = useContext(SpeechContext)
  if (!value) throw new Error('Speech missing')
  return value
}
