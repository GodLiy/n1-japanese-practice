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
      <p className="lede">没有账号。语速、假名、主题、成绩和生词都写在 localStorage，键名是 chowa-v1。</p>

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
          <li>{support.tts ? '可以朗读。iPhone 和 iPad 请先关掉侧面静音。' : '不能朗读。题目和参考答案仍可看。'}</li>
          <li>{support.recog ? '可以把日语转成文字，结果可以改。' : support.record ? '不能自动转成文字。可以录音回听，再把句子打出来对照。' : '不能识别，也不能录音。可以把话说完后打出来对照。'}</li>
          <li>{support.secure ? '当前是安全连接，麦克风可用。' : '当前不是安全连接，麦克风不可用。'}</li>
        </ul>
        <p>
          这个网站没有服务器，不保存录音，也不把声音传到自己的后台。朗读和麦克风可以在 iPhone、iPad 的 Safari、安卓的 Chrome，以及电脑上的 Safari、Chrome、Edge 使用。识别交给浏览器；浏览器自己的识别服务可能会处理声音。不能识别时，可以录音回听自己的日语，或把句子打出来评分。
        </p>
      </section>

      <section className="paper inset">
        <h2>清除成绩</h2>
        <p className="fine">设置和生词会留下。连续天数、分数和最近记录会删掉。</p>
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

function readSupport(): { tts: boolean; recog: boolean; record: boolean; secure: boolean } {
  if (typeof window === 'undefined') return { tts: false, recog: false, record: false, secure: false }
  const host = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }
  return {
    tts: 'speechSynthesis' in window,
    recog: Boolean(host.SpeechRecognition || host.webkitSpeechRecognition),
    record: typeof MediaRecorder !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia),
    secure: window.isSecureContext,
  }
}
