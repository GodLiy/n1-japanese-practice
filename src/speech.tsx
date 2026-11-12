import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { SpeechContext } from './lib/speech-context.ts'
import type { SpeakLine } from './lib/speech-context.ts'
import { plain } from './lib/ruby.ts'

type VoicePack = {
  voice: SpeechSynthesisVoice | null
  pitch: number
  rateScale: number
}

const PITCHES = [
  { pitch: 1, rateScale: 1 },
  { pitch: 0.7, rateScale: 0.92 },
  { pitch: 1.24, rateScale: 1.06 },
  { pitch: 0.82, rateScale: 0.88 },
]

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

function genderOf(voice: SpeechSynthesisVoice): 'f' | 'm' | 'u' {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase()
  if (/female|woman|\u5973|nanami|kyoko|haruka|mizuki|sayaka|ayane|nozomi|sakura|sumire/.test(name)) return 'f'
  if (/male|\bman\b|\u7537|ichiro|keita|takumi|osamu|daichi|kenji/.test(name)) return 'm'
  return 'u'
}

function japaneseVoices(): SpeechSynthesisVoice[] {
  if (!window.speechSynthesis) return []
  return window.speechSynthesis
    .getVoices()
    .filter((voice) => voice.lang.toLowerCase().replaceAll('_', '-').startsWith('ja'))
    .sort((a, b) => rankVoice(b) - rankVoice(a))
}

function voicePacks(voices: SpeechSynthesisVoice[], slots: number): VoicePack[] {
  const female = voices.filter((voice) => genderOf(voice) === 'f')
  const male = voices.filter((voice) => genderOf(voice) === 'm')
  const packs: VoicePack[] = []
  for (let slot = 0; slot < slots; slot += 1) {
    let voice: SpeechSynthesisVoice | null = null
    if (female.length && male.length) {
      const bucket = slot % 2 === 0 ? female : male
      voice = bucket[Math.floor(slot / 2) % bucket.length] ?? null
    } else if (voices.length > 1) {
      voice = voices[slot % voices.length] ?? null
    } else {
      voice = voices[0] ?? null
    }
    const distinct = voices.length <= 1
    const tweak = distinct ? PITCHES[slot % PITCHES.length] : PITCHES[0]
    packs.push({ voice, pitch: tweak?.pitch ?? 1, rateScale: tweak?.rateScale ?? 1 })
  }
  for (let slot = 1; slot < packs.length; slot += 1) {
    const current = packs[slot]
    const earlier = packs.findIndex((pack, index) => index < slot && pack.voice && pack.voice === current?.voice)
    if (current && earlier >= 0) {
      const tweak = PITCHES[slot % PITCHES.length] ?? PITCHES[1]
      packs[slot] = { voice: current.voice, pitch: tweak?.pitch ?? 0.7, rateScale: tweak?.rateScale ?? 0.92 }
    }
  }
  return packs
}

export function describeVoices(voices: SpeechSynthesisVoice[]): { label: string; note: string } {
  if (!window.speechSynthesis) {
    return { label: '这个浏览器不能朗读', note: '不能朗读时，题目和原文仍可看。' }
  }
  if (!voices.length) {
    return {
      label: '没有检测到日语语音，将使用默认语音。声调可能不准。',
      note: '对话只有一套默认语音时，会用不同的音高和语速区分说话人。',
    }
  }
  const female = voices.filter((voice) => genderOf(voice) === 'f').length
  const male = voices.filter((voice) => genderOf(voice) === 'm').length
  const top = voices[0]
  const label = `日语语音：${top?.name ?? '默认'}${top?.localService ? '（本机）' : '（由浏览器提供）'}`
  if (voices.length === 1) {
    return { label, note: '只检测到一种日语语音。对话会用不同的音高和语速区分说话人。' }
  }
  if (female && male) {
    return { label, note: `检测到 ${voices.length} 种日语语音，对话会按说话人分开使用。` }
  }
  return { label, note: `检测到 ${voices.length} 种日语语音。对话会尽量分配给不同的声音。` }
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

export function SpeechProvider({ children }: { children: ReactNode }) {
  const [speaking, setSpeaking] = useState(false)
  const [activeToken, setActiveToken] = useState(0)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copy, setCopy] = useState(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return describeVoices([])
    return describeVoices(japaneseVoices())
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
    const update = () => setCopy(describeVoices(japaneseVoices()))
    window.speechSynthesis.addEventListener('voiceschanged', update)
    const timer = window.setTimeout(update, 400)
    const later = window.setTimeout(update, 1500)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update)
      window.clearTimeout(timer)
      window.clearTimeout(later)
    }
  }, [supported])

  const stop = useCallback(() => {
    generation.current += 1
    clearTimer()
    window.speechSynthesis?.cancel()
    setSpeaking(false)
    setActiveToken(0)
    setActiveSpeaker(null)
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
    setActiveSpeaker(null)
    const voices = japaneseVoices()
    const slotCount = Math.max(1, ...lines.map((line) => (line.slot ?? 0) + 1))
    const packs = voicePacks(voices, slotCount)
    const queue = lines.flatMap((line, lineIndex) =>
      splitSentences(plain(line.text)).map((text) => ({
        text,
        slot: line.slot ?? 0,
        speaker: line.speaker,
        lineIndex,
      })),
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
        setActiveSpeaker(null)
        return
      }
      const item = queue[index]
      index += 1
      if (!item) return
      const utterance = new SpeechSynthesisUtterance(item.text)
      utterance.lang = 'ja-JP'
      const pack = packs[item.slot] ?? packs[0]
      utterance.rate = Math.min(1.4, Math.max(0.6, rate * (pack?.rateScale ?? 1)))
      utterance.pitch = pack?.pitch ?? 1
      if (pack?.voice) utterance.voice = pack.voice
      utterance.onstart = () => {
        if (generation.current !== token) return
        setActiveSpeaker(item.speaker ?? null)
      }
      utterance.onend = () => window.setTimeout(step, 220)
      utterance.onerror = (event) => {
        if (generation.current !== token) return
        if (event.error === 'canceled' || event.error === 'interrupted') return
        clearTimer()
        setSpeaking(false)
        setActiveToken(0)
        setActiveSpeaker(null)
        setError('朗读被浏览器中断了。再播放一次。')
      }
      window.speechSynthesis.resume()
      window.speechSynthesis.speak(utterance)
    }
    window.setTimeout(step, 40)
    return token
  }, [clearTimer])

  const value = useMemo(
    () => ({
      speaking,
      activeToken,
      activeSpeaker,
      voiceLabel: copy.label,
      voiceNote: copy.note,
      error,
      supported,
      speak,
      stop,
    }),
    [speaking, activeToken, activeSpeaker, copy, error, supported, speak, stop],
  )

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
}
