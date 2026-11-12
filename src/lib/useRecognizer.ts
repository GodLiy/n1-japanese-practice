import { useCallback, useEffect, useRef, useState } from 'react'
import { isAppleTouch } from './device.ts'

type RecAlternative = { transcript: string }
type RecResult = { isFinal: boolean; 0?: RecAlternative }
type RecEvent = { results: ArrayLike<RecResult> }
type RecError = { error: string }
type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: RecEvent) => void) | null
  onerror: ((event: RecError) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

export type InputMode = 'speech' | 'record' | 'type'

function getCtor(): (new () => Rec) | null {
  const host = window as unknown as {
    SpeechRecognition?: new () => Rec
    webkitSpeechRecognition?: new () => Rec
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function canUseRecorder(): boolean {
  return typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function errorMessage(code: string): string | null {
  if (code === 'aborted' || code === 'no-speech') return null
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return '麦克风被拒绝了。请在浏览器设置里允许此网站使用麦克风，然后重试。'
  }
  if (code === 'audio-capture') return '没有找到可用的麦克风。可以把句子打在下面。'
  if (code === 'network') {
    return '识别服务连不上。声音没有上传到这个网站。可以听自己的录音，或把句子打出来对照。'
  }
  return '识别中断了。可以再试一次，听录音，或直接改正文字。'
}

function deviceError(err: unknown): string {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : ''
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return '麦克风被拒绝了。请在浏览器设置里允许此网站使用麦克风，然后重试。'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '没有找到可用的麦克风。可以把句子打在下面。'
  return '麦克风没有打开。可以再试一次，或直接把句子打在下面。'
}

export function useRecognizer() {
  const recRef = useRef<Rec | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const wantRef = useRef(false)
  const finalRef = useRef('')
  const audioUrlRef = useRef<string | null>(null)
  const recogLive = useRef(false)
  const recordLive = useRef(false)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const apple = typeof window !== 'undefined' && isAppleTouch()
  const supported = typeof window !== 'undefined' && Boolean(getCtor())
  const canRecord = typeof window !== 'undefined' && canUseRecorder()
  const secure = typeof window !== 'undefined' && window.isSecureContext
  const inputMode: InputMode = supported ? 'speech' : canRecord ? 'record' : 'type'

  const releaseStream = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const rememberAudio = (url: string) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = url
    setAudioUrl(url)
  }

  const settle = useCallback(() => {
    if (!recogLive.current && !recordLive.current) setListening(false)
  }, [])

  const stop = useCallback(() => {
    wantRef.current = false
    const rec = recRef.current
    recRef.current = null
    if (rec) {
      rec.onend = null
      rec.onerror = null
      try {
        rec.stop()
      } catch {
        try {
          rec.abort()
        } catch {
          /* already stopped */
        }
      }
    }
    recogLive.current = false
    const recorder = mediaRef.current
    if (recorder && recorder.state !== 'inactive') {
      try {
        recorder.stop()
      } catch {
        recordLive.current = false
        releaseStream()
      }
    } else {
      recordLive.current = false
      releaseStream()
    }
    setListening(false)
  }, [])

  const start = useCallback(() => {
    if (!window.isSecureContext) {
      setError('麦克风需要安全连接（HTTPS）。')
      return
    }
    const Ctor = getCtor()
    const record = canUseRecorder()
    if (!Ctor && !record) {
      setError('这台设备不能录音，也不能识别。把你说的话打在下面。')
      return
    }
    wantRef.current = true
    finalRef.current = ''
    setText('')
    setError(null)
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
      setAudioUrl(null)
    }

    if (Ctor) {
      try {
        recRef.current?.abort()
      } catch {
        /* no previous session */
      }
      const rec = new Ctor()
      rec.lang = 'ja-JP'
      rec.continuous = !apple
      rec.interimResults = !apple
      let restarts = 0
      rec.onresult = (event) => {
        if (apple) {
          let piece = ''
          for (let i = 0; i < event.results.length; i += 1) {
            const result = event.results[i]
            if (result?.isFinal) piece += result[0]?.transcript ?? ''
          }
          if (!piece) return
          finalRef.current = `${finalRef.current}${piece}`
          setText(finalRef.current)
          return
        }
        let finalText = ''
        let interim = ''
        for (let i = 0; i < event.results.length; i += 1) {
          const result = event.results[i]
          const piece = result?.[0]?.transcript ?? ''
          if (result?.isFinal) finalText += piece
          else interim += piece
        }
        setText(finalText + interim)
      }
      rec.onerror = (event) => {
        if (event.error === 'audio-capture' && recordLive.current) {
          recogLive.current = false
          settle()
          return
        }
        const message = errorMessage(event.error)
        if (message) setError(message)
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
          recogLive.current = false
          if (!recordLive.current) wantRef.current = false
          settle()
        }
      }
      rec.onend = () => {
        if (wantRef.current && apple && restarts < 30) {
          restarts += 1
          try {
            rec.start()
            return
          } catch {
            /* this session cannot restart */
          }
        }
        recogLive.current = false
        settle()
      }
      recRef.current = rec
      try {
        rec.start()
        recogLive.current = true
        setListening(true)
      } catch {
        recogLive.current = false
        if (!record) {
          wantRef.current = false
          setError('麦克风正在被占用。停掉别的录音后再试，或把句子打在下面。')
          setListening(false)
        }
      }
    }

    if (!record) return
    navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        if (!wantRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        releaseStream()
        streamRef.current = stream
        const mime = pickMime()
        const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        chunksRef.current = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onstop = () => {
          recordLive.current = false
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/mp4' })
          if (blob.size > 0) rememberAudio(URL.createObjectURL(blob))
          releaseStream()
          mediaRef.current = null
          settle()
        }
        mediaRef.current = recorder
        recorder.start()
        recordLive.current = true
        setListening(true)
      })
      .catch((err: unknown) => {
        recordLive.current = false
        if (recogLive.current) return
        wantRef.current = false
        setListening(false)
        setError(deviceError(err))
      })
  }, [apple, settle])

  useEffect(() => {
    return () => {
      wantRef.current = false
      try {
        recRef.current?.abort()
      } catch {
        /* already gone */
      }
      try {
        if (mediaRef.current && mediaRef.current.state !== 'inactive') mediaRef.current.stop()
      } catch {
        /* already gone */
      }
      releaseStream()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  return { listening, text, setText, error, supported, canRecord, secure, inputMode, audioUrl, start, stop }
}
