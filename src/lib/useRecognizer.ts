import { useCallback, useEffect, useRef, useState } from 'react'
import { startPcmCapture, unlockAudio, watchLevel, type PcmCapture } from './audio-local.ts'
import { baiduMicMessage, isAppleTouch, isBaidu, isNativeApp, isWeChat, wechatMicMessage } from './device.ts'
import { showHostGuide } from './host-guide.ts'
import { canCaptureMic, openMicrophone } from './mic-open.ts'
import { prepareNativeMic, quietPlayback } from './native-mic.ts'
import { asrFailureMessage, asrNeedsHostGuide, cancelModelLoad, transcribeJapanese, AsrCancelled } from './local-asr.ts'
import { useStore } from './useStore.ts'

type RecAlternative = { transcript: string }
type RecResult = { isFinal: boolean; 0?: RecAlternative }
type RecEvent = { results: ArrayLike<RecResult> }
type RecError = { error: string }
type Rec = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
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
  return canCaptureMic()
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return ''
  const types = ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm', 'audio/aac']
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? ''
}

function errorMessage(code: string): string | null {
  if (code === 'aborted' || code === 'no-speech') return null
  if (code === 'not-allowed' || code === 'service-not-allowed') {
    if (isWeChat()) return wechatMicMessage()
    if (isBaidu()) return baiduMicMessage()
    return '麦克风被拒绝了。请到设置页查看如何重新允许，然后再试。'
  }
  if (code === 'audio-capture') return '没有找到可用的麦克风。可以把句子打在下面。'
  if (code === 'network') {
    return '浏览器的识别服务连不上。声音没有上传。若已打开本机识别，会用刚才的录音再听一遍。'
  }
  return '识别中断了。可以再试一次，或直接改正文字。'
}

function deviceError(err: unknown): string {
  const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : ''
  if (name === 'NotAllowedError' || name === 'SecurityError' || name === 'MicSilent') {
    if (isWeChat()) {
      showHostGuide('speak')
      return wechatMicMessage()
    }
    if (isBaidu()) {
      showHostGuide('speak')
      return baiduMicMessage()
    }
    return '麦克风被拒绝了。请到设置页按说明重新允许，然后再试。'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return '没有找到可用的麦克风。可以把句子打在下面。'
  return '麦克风没有打开。可以再试一次，或直接把句子打在下面。'
}

export function useRecognizer() {
  const { state } = useStore()
  const localAsrRef = useRef(state.settings.localAsr)
  localAsrRef.current = state.settings.localAsr
  const recRef = useRef<Rec | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const wantRef = useRef(false)
  const finalRef = useRef('')
  const textRef = useRef('')
  const audioUrlRef = useRef<string | null>(null)
  const recogLive = useRef(false)
  const recordLive = useRef(false)
  const peakRef = useRef(0)
  const healthyRef = useRef(true)
  const busyRef = useRef(false)
  const stopMeter = useRef<(() => void) | null>(null)
  const pcmRef = useRef<PcmCapture | null>(null)
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [level, setLevel] = useState(0)
  const [heard, setHeard] = useState(false)
  const [asrStatus, setAsrStatus] = useState<string | null>(null)
  const apple = typeof window !== 'undefined' && isAppleTouch()
  const canRecord = typeof window !== 'undefined' && canUseRecorder()
  const supported = typeof window !== 'undefined' && Boolean(getCtor()) && !(isBaidu() && canRecord)
  const secure = typeof window !== 'undefined' && window.isSecureContext
  const inputMode: InputMode = supported ? 'speech' : canRecord ? 'record' : 'type'

  const writeText = (value: string) => {
    textRef.current = value
    setText(value)
  }

  const takeSamples = (): Float32Array | null => {
    const capture = pcmRef.current
    pcmRef.current = null
    if (!capture) return null
    try {
      return capture.stop()
    } catch {
      return null
    }
  }

  const releaseStream = () => {
    stopMeter.current?.()
    stopMeter.current = null
    if (pcmRef.current) {
      try { pcmRef.current.stop() } catch { /* already stopped */ }
      pcmRef.current = null
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setLevel(0)
  }

  const rememberAudio = (url: string) => {
    if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    audioUrlRef.current = url
    setAudioUrl(url)
  }

  const settle = useCallback(() => {
    if (!recogLive.current && !recordLive.current) setListening(false)
  }, [])

  const runLocal = useCallback(async (blob: Blob, samples: Float32Array | null) => {
    const pcmOk = !!samples && samples.length >= 1600
    if (!localAsrRef.current) {
      if (!textRef.current.trim()) {
        if (isBaidu() && peakRef.current <= 0.012 && !healthyRef.current) {
          showHostGuide('speak')
          setError(baiduMicMessage())
          return
        }
        setError(peakRef.current > 0.012
          ? '听到了声音，但浏览器没有识别出文字。可以在设置里打开本机识别，或把句子打在下面。'
          : '没有听到足够的声音。请靠近麦克风再说一次。设置里可以检查麦克风是否已允许。')
      }
      return
    }
    if (!pcmOk && blob.size < 400) {
      if (isBaidu() && peakRef.current <= 0.012 && !healthyRef.current) {
        showHostGuide('speak')
        setError(baiduMicMessage())
      }
      return
    }
    if (!pcmOk && peakRef.current <= 0.012 && !textRef.current.trim()) {
      if (isBaidu() && !healthyRef.current) {
        showHostGuide('speak')
        setError(baiduMicMessage())
        return
      }
      setError('没有听到足够的声音。请靠近麦克风，看到音量条在动之后再说。')
      return
    }
    if (textRef.current.trim() && supported) return
    busyRef.current = true
    setAsrStatus('浏览器没有给出文字。正在用本机日语模型再听一遍…')
    try {
      const audio: Float32Array | Blob = pcmOk && samples ? samples : blob
      const { text: heardText, truncated } = await transcribeJapanese(audio, setAsrStatus)
      if (textRef.current.trim() && supported) return
      if (heardText) writeText(heardText)
      else setError('听到了声音，但没有识别出日语。可以再说一次，或把句子打在下面。')
      if (truncated) setAsrStatus('只识别了前 90 秒。')
      else setAsrStatus(null)
    } catch (error) {
      if (textRef.current.trim() && supported) return
      if (error instanceof AsrCancelled || (error instanceof Error && error.name === 'AsrCancelled')) {
        setAsrStatus(null)
        return
      }
      if (asrNeedsHostGuide(error)) showHostGuide('speak')
      setError(asrFailureMessage(error))
      setAsrStatus(null)
    } finally {
      busyRef.current = false
    }
  }, [supported])

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

  const beginCapture = useCallback((allowSynth: boolean) => {
    const Ctor = getCtor()
    const record = canUseRecorder()
    const baidu = isBaidu()
    const native = isNativeApp()
    const useBrowserRecognition = allowSynth && Boolean(Ctor) && !(baidu && record) && !native
    if (!useBrowserRecognition && !record) {
      if (isWeChat() || baidu) showHostGuide('speak')
      setError(isWeChat() ? wechatMicMessage() : baidu ? baiduMicMessage() : '这台设备不能录音，也不能识别。把你说的话打在下面。')
      return
    }
    wantRef.current = true
    finalRef.current = ''
    peakRef.current = 0
    healthyRef.current = !baidu
    setHeard(false)
    setAsrStatus(null)
    writeText('')
    setError(null)
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
      setAudioUrl(null)
    }

    if (useBrowserRecognition && Ctor) {
      try {
        recRef.current?.abort()
      } catch {
        /* no previous session */
      }
      const rec = new Ctor()
      rec.lang = 'ja-JP'
      rec.continuous = !apple
      rec.interimResults = !apple
      rec.maxAlternatives = 1
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
          writeText(finalRef.current)
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
        writeText(finalText + interim)
      }
      rec.onerror = (event) => {
        if (event.error === 'audio-capture' && recordLive.current) {
          recogLive.current = false
          settle()
          return
        }
        const blocked = event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture'
        if (blocked && (record || recordLive.current)) {
          recogLive.current = false
          settle()
          return
        }
        if ((event.error === 'not-allowed' || event.error === 'service-not-allowed') && (isWeChat() || isBaidu())) showHostGuide('speak')
        const message = errorMessage(event.error)
        if (message && event.error !== 'network') setError(message)
        if (event.error === 'network' && !localAsrRef.current) setError(message)
        if (blocked) {
          recogLive.current = false
          wantRef.current = false
          settle()
        }
      }
      rec.onend = () => {
        if (wantRef.current && !apple && restarts < 8) {
          restarts += 1
          window.setTimeout(() => {
            if (!wantRef.current) return
            try {
              rec.start()
            } catch {
              recogLive.current = false
              settle()
            }
          }, 200)
          return
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
    openMicrophone()
      .then((stream) => {
        if (!wantRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }
        releaseStream()
        streamRef.current = stream
        const markHealthy = () => {
          healthyRef.current = stream.getAudioTracks().some((track) => track.readyState === 'live' && track.enabled && !track.muted)
        }
        markHealthy()
        for (const track of stream.getAudioTracks()) {
          track.addEventListener('unmute', markHealthy)
          track.addEventListener('mute', markHealthy)
        }
        if (baidu) {
          window.setTimeout(() => {
            if (!wantRef.current || peakRef.current > 0.012 || healthyRef.current) return
            setAsrStatus('百度还没有把声音传进来。请确认系统里百度的麦克风已打开，再点一次说话。')
            showHostGuide('speak')
          }, 2500)
        }
        const attachMeter = () => {
          if (!wantRef.current) return
          stopMeter.current = watchLevel(stream, setLevel, (rms) => {
            if (rms > peakRef.current) peakRef.current = rms
            if (rms > 0.012) setHeard(true)
          })
          pcmRef.current = startPcmCapture(stream)
        }
        if (native) window.requestAnimationFrame(() => window.requestAnimationFrame(attachMeter))
        else attachMeter()
        const mime = pickMime()
        let recorder: MediaRecorder
        try {
          recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream)
        } catch {
          recorder = new MediaRecorder(stream)
        }
        chunksRef.current = []
        recorder.ondataavailable = (event) => {
          if (event.data.size > 0) chunksRef.current.push(event.data)
        }
        recorder.onstop = () => {
          recordLive.current = false
          const samples = takeSamples()
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || mime || 'audio/mp4' })
          if (blob.size > 0) rememberAudio(URL.createObjectURL(blob))
          releaseStream()
          mediaRef.current = null
          settle()
          if (blob.size > 0 || (samples && samples.length >= 1600)) void runLocal(blob, samples)
          else if (peakRef.current > 0.012) setError('听到了声音，但没有留下可以识别的录音。请再点一次说话。')
        }
        mediaRef.current = recorder
        try {
          if (baidu) recorder.start(250)
          else recorder.start()
        } catch {
          recorder.start()
        }
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
  }, [apple, runLocal, settle])

  const start = useCallback(() => {
    if (busyRef.current) {
      setError('上一段还在本机识别，请稍等。可以先把句子打在下面。')
      return
    }
    if (!window.isSecureContext) {
      setError('麦克风需要安全连接（HTTPS）。')
      return
    }
    const native = isNativeApp()
    if (!native) unlockAudio()
    else quietPlayback()
    if (native) {
      wantRef.current = true
      setError(null)
      setAsrStatus('正在向系统请求麦克风…')
      void prepareNativeMic().then((ok) => {
        if (!wantRef.current) return
        setAsrStatus(null)
        if (!ok) {
          wantRef.current = false
          setListening(false)
          setError('麦克风被拒绝了。请到系统设置里允许「聴話」使用麦克风，然后再点一次说话。句子也可以打在下面。')
          return
        }
        beginCapture(false)
      })
      return
    }
    beginCapture(true)
  }, [beginCapture])

  const cancelAsr = useCallback(() => {
    cancelModelLoad()
    busyRef.current = false
    setAsrStatus(null)
    setError('已停下这次下载。句子仍可以打在下面评分。下次说话时可以再试。')
  }, [])

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

  return {
    listening,
    text,
    setText: writeText,
    error,
    supported,
    canRecord,
    secure,
    inputMode,
    audioUrl,
    level,
    heard,
    asrStatus,
    localAsr: state.settings.localAsr,
    start,
    stop,
    cancelAsr,
  }
}
