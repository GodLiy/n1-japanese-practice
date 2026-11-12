import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { SpeechContext } from './lib/speech-context.ts'
import type { SpeakLine } from './lib/speech-context.ts'
import { plain } from './lib/ruby.ts'

function rankVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  let score = voice.localService ? 80 : 0
  if (name.includes('nanami')) score += 40
  else if (name.includes('kyoko')) score += 36
  else if (name.includes('haruka')) score += 34
  else if (name.includes('google')) score += 22
  else if (name.includes('ichiro') || name.includes('keita')) score += 18
  return score
}

function japaneseVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return []
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().replaceAll('_', '-').startsWith('ja'))
    .sort((a, b) => rankVoice(b) - rankVoice(a))
}

function splitSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[。！？])/)
    .map((part) => part.trim())
    .filter(Boolean)
  const out: string[] = []
  for (const part of parts.length ? parts : [text.trim()]) {
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

function voiceLabel(voices: SpeechSynthesisVoice[]): string {
  if (!window.speechSynthesis) return '这个浏览器不能朗读'
  if (!voices.length) return '没有检测到日语语音，将使用默认语音。声调可能不准。'
  const top = voices[0]
  return `日语语音：${top.name}${top.localService ? '（本机）' : '（由浏览器提供）'}`
}

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [speaking, setSpeaking] = useState(false)
  const [activeToken, setActiveToken] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [label, setLabel] = useState(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return '这个浏览器不能朗读'
    const voices = japaneseVoices()
    return voices.length ? voiceLabel(voices) : '正在读取语音…'
  })
  const generation = useRef(0)
  const timerRef = useRef<number | null>(null)
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!supported) return
    const update = () => setLabel(voiceLabel(japaneseVoices()))
    window.speechSynthesis.addEventListener('voiceschanged', update)
    const timer = window.setTimeout(update, 500)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update)
      window.clearTimeout(timer)
    }
  }, [supported])

  const stop = useCallback(() => {
    generation.current += 1
    clearTimer()
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setActiveToken(0)
  }, [clearTimer])

  useEffect(() => {
    if (pathRef.current === location.pathname) return
    pathRef.current = location.pathname
    stop()
  }, [location.pathname, stop])

  const speak = useCallback((lines: SpeakLine[], rate: number) => {
    if (!window.speechSynthesis) {
      setError('这个浏览器不能朗读。还可以看原文、做题、对照参考答案。')
      return 0
    }
    const token = generation.current + 1
    generation.current = token
    window.speechSynthesis.cancel()
    setError(null)
    setSpeaking(true)
    setActiveToken(token)
    const pair = japaneseVoices()
    const queue = lines.flatMap((line) =>
      splitSentences(plain(line.text)).map((text) => ({ text, slot: line.slot ?? 0 })),
    )
    if (!queue.length) {
      setSpeaking(false)
      setActiveToken(0)
      return token
    }
    clearTimer()
    timerRef.current = window.setInterval(() => {
      if (generation.current !== token) {
        clearTimer()
        return
      }
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause()
        window.speechSynthesis.resume()
      }
    }, 8000)
    let index = 0
    const step = () => {
      if (generation.current !== token) return
      if (index >= queue.length) {
        clearTimer()
        setSpeaking(false)
        setActiveToken(0)
        return
      }
      const item = queue[index]
      index += 1
      if (!item) return
      const utterance = new SpeechSynthesisUtterance(item.text)
      utterance.lang = 'ja-JP'
      utterance.rate = rate
      const voice = pair[item.slot % Math.max(pair.length, 1)]
      if (voice) utterance.voice = voice
      else if (item.slot % 2 === 1) utterance.pitch = 0.84
      utterance.onend = () => window.setTimeout(step, 220)
      utterance.onerror = (event) => {
        if (generation.current !== token) return
        if (event.error === 'canceled' || event.error === 'interrupted') return
        clearTimer()
        setSpeaking(false)
        setActiveToken(0)
        setError('朗读被浏览器中断了。再播放一次。')
      }
      window.speechSynthesis.resume()
      window.speechSynthesis.speak(utterance)
    }
    window.setTimeout(step, 40)
    return token
  }, [clearTimer])

  const value = useMemo(
    () => ({ speaking, activeToken, voiceLabel: label, error, supported, speak, stop }),
    [speaking, activeToken, label, error, supported, speak, stop],
  )

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
}
