import { useCallback, useEffect, useRef, useState } from 'react'

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

function getCtor(): (new () => Rec) | null {
  const host = window as unknown as {
    SpeechRecognition?: new () => Rec
    webkitSpeechRecognition?: new () => Rec
  }
  return host.SpeechRecognition ?? host.webkitSpeechRecognition ?? null
}

function errorMessage(code: string): string | null {
  if (code === 'aborted') return null
  if (code === 'no-speech') return '没有听到日语。靠近麦克风，说完再点停止。'
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    return '麦克风被拒绝了。在地址栏允许麦克风，然后重试。'
  }
  if (code === 'audio-capture') return '没有找到可用的麦克风。'
  if (code === 'network') {
    return '识别服务连不上。这个网站不接收声音。你可以先把话打出来对照，或换 Chrome / Edge。'
  }
  return '识别中断了。可以再试一次，或直接改正文字。'
}

export function useRecognizer() {
  const recRef = useRef<Rec | null>(null)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const supported = typeof window !== 'undefined' && Boolean(getCtor())
  const secure = typeof window !== 'undefined' && window.isSecureContext

  const stop = useCallback(() => {
    recRef.current?.stop()
  }, [])

  const start = useCallback(() => {
    const Ctor = getCtor()
    if (!Ctor) {
      setError('这个浏览器没有日语语音识别。Chrome 或 Edge 最合适。你仍可以把话说完后打在下面，对照评分。')
      return
    }
    if (!window.isSecureContext) {
      setError('麦克风需要 HTTPS。本机开发地址可以，直接打开文件不行。')
      return
    }
    recRef.current?.abort()
    const rec = new Ctor()
    rec.lang = 'ja-JP'
    rec.continuous = true
    rec.interimResults = true
    setText('')
    setError(null)
    rec.onresult = (event) => {
      let finalText = ''
      let interim = ''
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i]
        const piece = result?.[0]?.transcript ?? ''
        if (result?.isFinal) finalText += piece
        else interim += piece
      }
      setText(finalText + interim)
    }
    rec.onerror = (event) => {
      const message = errorMessage(event.error)
      if (message) setError(message)
      if (event.error !== 'no-speech') setListening(false)
    }
    rec.onend = () => setListening(false)
    recRef.current = rec
    try {
      rec.start()
      setListening(true)
    } catch {
      setError('麦克风正在被占用。停掉别的录音后再试。')
      setListening(false)
    }
  }, [])

  useEffect(() => {
    return () => recRef.current?.abort()
  }, [])

  return { listening, text, setText, error, supported, secure, start, stop }
}
