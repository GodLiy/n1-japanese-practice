import { useState } from 'react'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useStore } from '../lib/useStore.ts'

const rates = [
  { value: 0.85, label: '慢' },
  { value: 0.95, label: '稍慢' },
  { value: 1, label: '普通' },
  { value: 1.1, label: '稍快' },
]

export function SettingsPage() {
  usePageTitle('设置')
  const { state, updateSettings, resetProgress } = useStore()
  const { settings } = state
  const [confirming, setConfirming] = useState(false)
  const support = readSupport()

  return (
    <section className="settings">
      <p className="eyebrow">本机</p>
      <h1>设置</h1>
      <p className="lede">没有账号。这些选择和成绩都写在 localStorage，键名是 chowa-v1。</p>

      <section className="paper inset">
        <h2>朗读速度</h2>
        <div className="chips">
          {rates.map((rate) => (
            <button key={rate.value} type="button" className={settings.rate === rate.value ? 'chip is-on' : 'chip'} onClick={() => updateSettings({ rate: rate.value })}>
              {rate.label}
            </button>
          ))}
        </div>
        <p className="fine">实际速度还受系统语音的限制。每篇里的「慢速」会再降一档。</p>
      </section>

      <section className="paper inset toggles">
        <div className="toggle-row">
          <div>
            <h2>难词注音</h2>
            <p className="fine">只给较难的词标读音，不是每字都注。</p>
          </div>
          <button type="button" className={settings.furigana ? 'switch on' : 'switch'} aria-pressed={settings.furigana} onClick={() => updateSettings({ furigana: !settings.furigana })}>
            <span />
          </button>
        </div>
        <div className="toggle-row">
          <div>
            <h2>中文提示</h2>
            <p className="fine">听解题目和选项下面显示中文。解释在作答后始终是中文。</p>
          </div>
          <button type="button" className={settings.hints ? 'switch on' : 'switch'} aria-pressed={settings.hints} onClick={() => updateSettings({ hints: !settings.hints })}>
            <span />
          </button>
        </div>
        <div className="toggle-row">
          <div>
            <h2>夜读</h2>
            <p className="fine">纸色和深色。跟日语字体无关。</p>
          </div>
          <button type="button" className={settings.theme === 'dark' ? 'switch on' : 'switch'} aria-pressed={settings.theme === 'dark'} onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}>
            <span />
          </button>
        </div>
      </section>

      <section className="paper inset">
        <h2>这台浏览器</h2>
        <ul className="support-list">
          <li>{support.tts ? '可以朗读。' : '不能朗读。题目和参考答案仍可看。'}</li>
          <li>{support.recog ? '可以识别日语。Chrome 和 Edge 最稳。' : '不能识别日语。可以把话说完后打出来对照。'}</li>
          <li>{support.secure ? '当前是安全连接，麦克风可用。' : '当前不是安全连接。请用本机地址或 HTTPS，不要直接打开文件。'}</li>
        </ul>
        <p>
          这个网站没有服务器，不保存录音，也不把声音传到自己的后台。按下麦克风后，识别交给浏览器的 Web Speech API。Chrome 可能会把声音交给浏览器厂商的识别服务。朗读同样由浏览器完成，优先使用本机日语语音。
        </p>
      </section>

      <section className="paper inset">
        <h2>清除成绩</h2>
        <p className="fine">设置会留下。连续天数、分数和最近记录会删掉。</p>
        {confirming ? (
          <div className="end-actions">
            <button type="button" className="btn danger" onClick={() => { resetProgress(); setConfirming(false) }}>
              确认清除
            </button>
            <button type="button" className="btn" onClick={() => setConfirming(false)}>
              留下
            </button>
          </div>
        ) : (
          <button type="button" className="btn" onClick={() => setConfirming(true)}>
            清除练习记录
          </button>
        )}
      </section>
    </section>
  )
}

function readSupport(): { tts: boolean; recog: boolean; secure: boolean } {
  if (typeof window === 'undefined') return { tts: false, recog: false, secure: false }
  const host = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return {
    tts: 'speechSynthesis' in window,
    recog: Boolean(host.SpeechRecognition || host.webkitSpeechRecognition),
    secure: window.isSecureContext,
  }
}
