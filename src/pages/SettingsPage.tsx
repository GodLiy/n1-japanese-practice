import { useState } from 'react'
import { MicSettings } from '../components/MicSettings.tsx'
import { downloadMirroredApk } from '../lib/apk-mirror.ts'
import { PAGES_URL, RELEASES_URL } from '../lib/asr-pack.ts'
import { isNativeApp } from '../lib/device.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useStore } from '../lib/useStore.ts'

const chinaSite = 'https://cdn.jsdmirror.com/gh/GodLiy/n1-japanese-practice@asr-a/'
const backupSite = 'https://cdn.jsdelivr.net/gh/GodLiy/n1-japanese-practice@asr-a/'

const rates = [
  { value: 0.8, label: '慢速' },
  { value: 1, label: '正常' },
  { value: 1.2, label: '较快' },
  { value: 1.5, label: '快速' },
]

export function SettingsPage() {
  usePageTitle('设置')
  const { state, updateSettings, resetProgress } = useStore()
  const { settings } = state
  const [confirming, setConfirming] = useState(false)
  const [apkNote, setApkNote] = useState<string | null>(null)
  const [apkBusy, setApkBusy] = useState(false)
  const support = readSupport()

  return (
    <section className="settings">
      <p className="eyebrow">本机</p>
      <h1>设置</h1>
      <p className="lede">没有账号。语速、假名、主题、麦克风和生词都写在 localStorage，键名是 chowa-v1。</p>

      <MicSettings />

      <section className="paper inset">
        <h2>国内网络</h2>
        <p className="fine">识别模型大约 250MB。说话时按国内镜像、jsDelivr、Hugging Face 的顺序下载，并核对校验和。录音不会上传。安装包也可以从国内镜像拼出来，签名和 GitHub Releases 相同。这个镜像的 CDN 会把网页当成纯文本，不能代替打开网站。安装好的应用里，听和阅读不访问 GitHub。目前没有备案域名。</p>
        <ul className="support-list">
          <li><a href={chinaSite}>国内镜像上的模型文件</a></li>
          <li><a href={backupSite}>备用镜像上的模型文件</a></li>
          <li><a href={PAGES_URL}>GitHub Pages</a></li>
          <li><a href={RELEASES_URL}>GitHub Releases</a></li>
        </ul>
        <div className="end-actions">
          <button
            type="button"
            className="btn primary"
            disabled={apkBusy}
            onClick={() => {
              setApkBusy(true)
              setApkNote('正在查找国内镜像上的安装包…')
              void downloadMirroredApk(setApkNote)
                .catch(() => setApkNote('镜像上还没有安装包，或下载没有完成。可以改从 GitHub Releases 下载；若 GitHub 打不开，请稍后再试镜像。'))
                .finally(() => setApkBusy(false))
            }}
          >
            下载安卓安装包
          </button>
        </div>
        {apkNote ? <p className="fine">{apkNote}</p> : null}
      </section>

      <section className="paper inset">
        <h2>朗读速度</h2>
        <div className="chips">
          {rates.map((rate) => (
            <button key={rate.value} type="button" className={settings.rate === rate.value ? 'chip is-on' : 'chip'} onClick={() => updateSettings({ rate: rate.value })}>
              {rate.label}
            </button>
          ))}
        </div>
        <p className="fine">默认是「较快」（1.2 倍），接近日常对话的速度。网站自带录音和系统朗读都用这一档。每篇里的「慢速」会再降一档。选好的速度留在这台设备上。</p>
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
        <h2>{isNativeApp() ? '这台手机' : '这台浏览器'}</h2>
        {isNativeApp() ? (
          <p>这是装在手机上的聴話。听、阅读和说播放安装包里的日语录音，不需要打开 GitHub。第一次点「说话」时，请允许麦克风。识别模型在第一次说话时从国内镜像下载，可以取消，句子仍能打在下面。声音不会上传。</p>
        ) : null}
        <ul className="support-list">
          <li>{support.tts ? '这台浏览器有朗读。没有日语语音时，听练习会改播网站自带的日语录音。iPhone 和 iPad 请把侧面静音开关拨到响铃，否则朗读和网页录音都没有声音。' : '这台浏览器没有语音合成。听练习会改播网站自带的日语录音；原文仍可看。'}</li>
          <li>{support.recog ? '浏览器可以尝试把日语转成文字。没听出来时，会用本机模型再听一遍。' : '这台浏览器没有自带语音识别。打开本机识别后，仍可以把录音转成文字。'}</li>
          <li>{support.secure ? '当前是安全连接。' : '当前不是安全连接，麦克风不可用。'}</li>
        </ul>
        <p>
          这个网站没有服务器，不保存录音，也不把声音或稿子传到自己的后台。Safari、Chrome、Edge、Firefox、三星浏览器、vivo 浏览器、手机百度、QQ，以及 iPhone、iPad、安卓都可以打开。有日语语音时，朗读用浏览器或系统语音，对话可以分声音。vivo 浏览器、安卓微信和 QQ 通常没有可用的日语语音，听练习、阅读、跟读、对话和文章会播放网站自带的日语录音。QQ 里点一下才出声；若仍然没有声音，点右上角菜单，用系统浏览器打开。说话时，浏览器自带的识别可能把声音交给浏览器厂商；本机模型则在这台设备上运行，录音不会上传。微信内置浏览器里，麦克风经常被拦住：iPhone / iPad 请打开「系统设置 → 微信 → 麦克风」，并点右上角「···」→「在Safari中打开」；安卓点「···」→「在浏览器中打开」。本站没有微信公众号接口。手机百度里若点了允许却录不到声音，请打开系统里百度的麦克风，或改用系统浏览器。
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
