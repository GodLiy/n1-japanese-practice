import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useLocation } from 'react-router'
import { desktopChrome, isAppleTouch } from './lib/device.ts'
import { SpeechContext } from './lib/speech-context.ts'
import type { SpeakLine } from './lib/speech-context.ts'
import { plain } from './lib/ruby.ts'

type VoicePack = {
  voiceURI: string | null
  name: string | null
  pitch: number
  rateScale: number
}

const PITCHES = [
  { pitch: 1, rateScale: 1 },
  { pitch: 0.7, rateScale: 0.92 },
  { pitch: 1.24, rateScale: 1.06 },
  { pitch: 0.82, rateScale: 0.88 },
]

const SILENT_HINT = '朗读没有开始。请确认没有静音，再点一次播放。iPhone 和 iPad 侧面的静音开关会关掉声音。'

function rankVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase()
  let score = voice.localService ? 80 : 0
  if (name.includes('kyoko')) score += 40
  else if (name.includes('o-ren') || name.includes('oren')) score += 38
  else if (name.includes('nanami')) score += 36
  else if (name.includes('siri')) score += 34
  else if (name.includes('haruka')) score += 32
  else if (name.includes('google')) score += 22
  else if (name.includes('ichiro') || name.includes('keita') || name.includes('otoya')) score += 18
  return score
}

function genderOf(voice: SpeechSynthesisVoice): 'f' | 'm' | 'u' {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase()
  if (/female|woman|\u5973|nanami|kyoko|haruka|mizuki|sayaka|ayane|nozomi|sakura|sumire|o-ren|oren/.test(name)) return 'f'
  if (/male|\bman\b|\u7537|ichiro|keita|otoya|takumi|osamu|daichi|kenji/.test(name)) return 'm'
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
    packs.push({
      voiceURI: voice?.voiceURI ?? null,
      name: voice?.name ?? null,
      pitch: tweak?.pitch ?? 1,
      rateScale: tweak?.rateScale ?? 1,
    })
  }
  for (let slot = 1; slot < packs.length; slot += 1) {
    const current = packs[slot]
    const earlier = packs.findIndex((pack, index) => index < slot && pack.voiceURI && pack.voiceURI === current?.voiceURI && pack.name === current.name)
    if (current && earlier >= 0) {
      const tweak = PITCHES[slot % PITCHES.length] ?? PITCHES[1]
      packs[slot] = { ...current, pitch: tweak?.pitch ?? 0.7, rateScale: tweak?.rateScale ?? 0.92 }
    }
  }
  return packs
}

function liveVoice(pack: VoicePack | undefined): SpeechSynthesisVoice | null {
  if (!pack?.voiceURI && !pack?.name) return null
  return japaneseVoices().find((voice) => voice.voiceURI === pack.voiceURI && voice.name === pack.name) ?? null
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
  const [paused, setPaused] = useState(false)
  const [activeToken, setActiveToken] = useState(0)
  const [activeSpeaker, setActiveSpeaker] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copy, setCopy] = useState(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return describeVoices([])
    return describeVoices(japaneseVoices())
  })
  const generation = useRef(0)
  const keepAliveRef = useRef<number | null>(null)
  const watchdogRef = useRef<number | null>(null)
  const pausedRef = useRef(false)
  const location = useLocation()
  const pathRef = useRef(location.pathname)
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window
  const canPause = supported && !isAppleTouch() && typeof window.speechSynthesis.pause === 'function'

  const clearKeepAlive = useCallback(() => {
    if (keepAliveRef.current !== null) {
      window.clearInterval(keepAliveRef.current)
      keepAliveRef.current = null
    }
  }, [])

  const clearWatchdog = useCallback(() => {
    if (watchdogRef.current !== null) {
      window.clearTimeout(watchdogRef.current)
      watchdogRef.current = null
    }
  }, [])

  const resetPlaying = useCallback(() => {
    pausedRef.current = false
    setPaused(false)
    setSpeaking(false)
    setActiveToken(0)
    setActiveSpeaker(null)
  }, [])

  useEffect(() => {
    if (!supported) return
    const update = () => setCopy(describeVoices(japaneseVoices()))
    window.speechSynthesis.addEventListener('voiceschanged', update)
    const prime = () => {
      window.speechSynthesis.getVoices()
    }
    window.addEventListener('pointerdown', prime)
    const timer = window.setTimeout(update, 400)
    const later = window.setTimeout(update, 1500)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', update)
      window.removeEventListener('pointerdown', prime)
      window.clearTimeout(timer)
      window.clearTimeout(later)
    }
  }, [supported])

  const stop = useCallback(() => {
    generation.current += 1
    clearKeepAlive()
    clearWatchdog()
    try {
      window.speechSynthesis?.cancel()
    } catch {
      /* already idle */
    }
    resetPlaying()
  }, [clearKeepAlive, clearWatchdog, resetPlaying])

  useEffect(() => {
    if (pathRef.current === location.pathname) return
    pathRef.current = location.pathname
    stop()
  }, [location.pathname, stop])

  const pause = useCallback(() => {
    if (!canPause || !window.speechSynthesis?.speaking) return
    try {
      window.speechSynthesis.pause()
      pausedRef.current = true
      setPaused(true)
    } catch {
      stop()
    }
  }, [canPause, stop])

  const resume = useCallback(() => {
    if (!canPause || !window.speechSynthesis) return
    try {
      window.speechSynthesis.resume()
      pausedRef.current = false
      setPaused(false)
    } catch {
      stop()
    }
  }, [canPause, stop])

  const speak = useCallback((lines: SpeakLine[], rate: number) => {
    if (!window.speechSynthesis) {
      setError('这个浏览器不能朗读。还可以看原文、做题、对照参考答案。')
      return 0
    }
    const synth = window.speechSynthesis
    synth.getVoices()
    const token = generation.current + 1
    generation.current = token
    clearKeepAlive()
    clearWatchdog()
    const wasBusy = synth.speaking || synth.pending || synth.paused
    if (wasBusy) {
      try {
        synth.cancel()
      } catch {
        /* nothing was playing */
      }
    }
    pausedRef.current = false
    setPaused(false)
    setError(null)
    setSpeaking(true)
    setActiveToken(token)
    setActiveSpeaker(null)
    const voices = japaneseVoices()
    const slotCount = Math.max(1, ...lines.map((line) => (line.slot ?? 0) + 1))
    const packs = voicePacks(voices, slotCount)
    const queue = lines.flatMap((line) =>
      splitSentences(plain(line.text)).map((text) => ({
        text,
        slot: line.slot ?? 0,
        speaker: line.speaker,
      })),
    )
    if (!queue.length) {
      resetPlaying()
      return token
    }
    if (desktopChrome()) {
      keepAliveRef.current = window.setInterval(() => {
        if (generation.current !== token || pausedRef.current) return
        if (synth.speaking && !synth.paused) {
          synth.pause()
          synth.resume()
        }
      }, 8000)
    }
    let index = 0
    const fail = (message: string) => {
      if (generation.current !== token) return
      generation.current += 1
      clearKeepAlive()
      clearWatchdog()
      try {
        synth.cancel()
      } catch {
        /* already idle */
      }
      resetPlaying()
      setError(message)
    }
    const step = () => {
      if (generation.current !== token) return
      if (index >= queue.length) {
        clearKeepAlive()
        clearWatchdog()
        resetPlaying()
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
      const voice = liveVoice(pack)
      if (voice) utterance.voice = voice
      let settled = false
      let started = false
      const began = performance.now()
      const finish = (advance: boolean) => {
        if (settled || generation.current !== token) return
        settled = true
        clearWatchdog()
        if (!advance) return
        window.setTimeout(step, 140)
      }
      const arm = (ms: number) => {
        clearWatchdog()
        watchdogRef.current = window.setTimeout(() => {
          if (generation.current !== token || settled) return
          if (!started) {
            fail(SILENT_HINT)
            return
          }
          finish(true)
        }, ms)
      }
      arm(4000)
      utterance.onstart = () => {
        if (generation.current !== token) return
        started = true
        setActiveSpeaker(item.speaker ?? null)
        arm(Math.min(25000, Math.max(6000, Math.round(item.text.length * 320 / utterance.rate))))
      }
      utterance.onend = () => {
        if (!started && performance.now() - began < 400) return
        finish(true)
      }
      utterance.onerror = (event) => {
        if (generation.current !== token || settled) return
        if (event.error === 'canceled' || event.error === 'interrupted') return
        if (event.error === 'not-allowed') {
          fail('浏览器没有允许朗读。请再点一次播放。')
          return
        }
        fail('朗读被浏览器中断了。再播放一次。')
      }
      try {
        if (synth.paused) synth.resume()
        synth.speak(utterance)
      } catch {
        fail('这个浏览器不能朗读。还可以看原文、做题、对照参考答案。')
      }
    }
    if (wasBusy && desktopChrome()) window.setTimeout(step, 40)
    else step()
    return token
  }, [clearKeepAlive, clearWatchdog, resetPlaying])

  const value = useMemo(
    () => ({
      speaking,
      paused,
      canPause,
      activeToken,
      activeSpeaker,
      voiceLabel: copy.label,
      voiceNote: copy.note,
      error,
      supported,
      speak,
      stop,
      pause,
      resume,
    }),
    [speaking, paused, canPause, activeToken, activeSpeaker, copy, error, supported, speak, stop, pause, resume],
  )

  return <SpeechContext.Provider value={value}>{children}</SpeechContext.Provider>
}
