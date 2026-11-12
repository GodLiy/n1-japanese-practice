import { useState } from 'react'
import { isAppleTouch } from '../lib/device.ts'
import type { SpeakLine } from '../lib/speech-context.ts'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'

export function PlayBar({
  lines,
  label = '播放',
  onPlay,
}: {
  lines: SpeakLine[]
  label?: string
  onPlay?: () => void
}) {
  const { state } = useStore()
  const speech = useSpeech()
  const [token, setToken] = useState(0)
  const mine = speech.speaking && speech.activeToken !== 0 && speech.activeToken === token
  const slow = Math.min(0.82, Math.round(state.settings.rate * 0.85 * 100) / 100)
  const speakers = [...new Set(lines.map((line) => line.speaker).filter((name): name is string => Boolean(name)))]
  const holding = mine
  const primary = !holding ? label : speech.paused ? '继续' : speech.canPause ? '暂停' : '停止'

  return (
    <div className="playbar">
      <div className="playbar-actions">
        <button
          type="button"
          className="btn primary"
          aria-pressed={holding}
          onClick={() => {
            if (speech.paused && mine) {
              speech.resume()
              return
            }
            if (mine && speech.canPause) {
              speech.pause()
              return
            }
            if (mine) {
              speech.stop()
              return
            }
            setToken(speech.speak(lines, state.settings.rate))
            onPlay?.()
          }}
        >
          {primary}
        </button>
        {holding && speech.canPause ? (
          <button type="button" className="btn" onClick={() => speech.stop()}>
            停止
          </button>
        ) : null}
        <button
          type="button"
          className="btn"
          onClick={() => {
            setToken(speech.speak(lines, slow))
            onPlay?.()
          }}
        >
          慢速
        </button>
      </div>
      <p className="voice-label">{speech.voiceLabel}</p>
      {speakers.length > 1 || speech.needsVoiceHelp ? <p className="fine">{speech.voiceNote}</p> : null}
      {isAppleTouch() ? <p className="fine">iPhone 和 iPad 侧面的静音开关会关掉朗读。要出声时，请拨到响铃。</p> : null}
      {mine && speech.activeSpeaker ? <p className="now-speaking">正在说：<span className="jp-ui">{speech.activeSpeaker}</span></p> : null}
      {speech.error ? <p className="form-error">{speech.error}</p> : null}
    </div>
  )
}
