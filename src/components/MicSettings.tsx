import { useEffect, useState } from 'react'
import { baiduMicMessage, isAppleTouch, isBaidu, isWeChat, wechatMicMessage } from '../lib/device.ts'
import { showHostGuide } from '../lib/host-guide.ts'
import { LOCAL_ASR_NOTE } from '../lib/local-asr.ts'
import { permissionLabel, readMicPermission, requestMicrophone } from '../lib/mic-permission.ts'
import type { MicPermission } from '../lib/mic-permission.ts'
import { useStore } from '../lib/useStore.ts'

export function MicSettings() {
  const { state, updateSettings } = useStore()
  const [permission, setPermission] = useState<MicPermission>('unknown')
  const [note, setNote] = useState<string | null>(null)
  const secure = typeof window !== 'undefined' && window.isSecureContext

  useEffect(() => {
    let alive = true
    void readMicPermission().then((next) => {
      if (alive) setPermission(next)
    })
    return () => {
      alive = false
    }
  }, [])

  const ask = async () => {
    if (!secure) {
      setNote('麦克风需要安全连接（HTTPS）。')
      return
    }
    const next = await requestMicrophone()
    setPermission(next)
    if (next === 'denied' && (isWeChat() || isBaidu())) showHostGuide('speak')
    const deniedNote = isWeChat() ? wechatMicMessage() : isBaidu() ? baiduMicMessage() : '浏览器仍然拒绝了麦克风。请按下面的步骤打开后再试。'
    setNote(next === 'granted' ? '已允许。回到练习后就可以说话。' : next === 'denied' ? deniedNote : null)
  }

  return (
    <section className="paper inset" id="mic">
      <h2>麦克风</h2>
      <p>说话练习用的是这台设备的麦克风。当前状态：<strong>{permissionLabel(permission)}</strong>。</p>
      {isWeChat() ? (
        <p className="form-error">
          你正在微信里打开。{isAppleTouch()
            ? '请先打开「系统设置 → 微信 → 麦克风」，再点右上角「···」→「在Safari中打开」。微信里的网页经常仍然不能录音。'
            : '请到系统「设置 → 应用 → 微信 → 权限 → 麦克风」打开。若网页仍不能录音，点右上角「···」→「在浏览器中打开」。'}
          这个网站没有微信公众号接口，不能在微信里强行打开麦克风。句子可以打出来评分。
        </p>
      ) : null}
      {isBaidu() ? (
        <p className="form-error">
          你正在手机百度或百度浏览器里打开。说话会直接录音，再用本机模型转成文字。
          {isAppleTouch()
            ? '请打开「系统设置 → 百度 → 麦克风」。若点了允许仍没有声音，点右上角「···」→「在Safari中打开」。'
            : '请打开系统「设置 → 应用 → 百度 → 权限 → 麦克风」。若音量条不动，点右上角菜单 →「在浏览器中打开」。'}
        </p>
      ) : null}
      <div className="end-actions">
        <button type="button" className="btn primary" onClick={() => void ask()}>
          {permission === 'denied' ? '再试一次' : '请求麦克风权限'}
        </button>
      </div>
      {note ? <p className="form-error">{note}</p> : null}
      {!secure ? <p className="form-error">当前不是安全连接，麦克风不可用。</p> : null}
      <div className="toggle-row mic-pref">
        <div>
          <h2>本机识别</h2>
          <p className="fine">浏览器没识别出文字时，用下载到这台设备上的日语模型再听一遍。{LOCAL_ASR_NOTE}</p>
        </div>
        <button
          type="button"
          className={state.settings.localAsr ? 'switch on' : 'switch'}
          aria-pressed={state.settings.localAsr}
          onClick={() => updateSettings({ localAsr: !state.settings.localAsr })}
        >
          <span />
        </button>
      </div>
      <h3>如果状态是「已阻止」</h3>
      <p className="fine">网站不能替你改系统权限。打开之后再点「再试一次」。</p>
      <ul className="support-list">
        <li>iPhone / iPad（Safari，以及 iOS 上的 Chrome）：设置 → Safari → 麦克风 → 允许。也可以点地址栏左侧的图标，把麦克风改成允许。侧面静音开关不会挡住麦克风，但会关掉朗读。</li>
        <li>电脑上的 Chrome / Edge：点地址栏左侧的锁或设置图标 → 网站设置 → 麦克风 → 允许，然后刷新。</li>
        <li>Firefox：点地址栏左侧的权限图标 → 麦克风 → 允许。Firefox 通常没有浏览器自带的语音识别，打开本机识别后仍可以把录音转成文字。</li>
        <li>安卓：点地址栏的锁 → 权限 → 麦克风 → 允许。若系统也关了，到系统设置 → 应用 → 正在用的浏览器 → 权限 → 麦克风。vivo 浏览器可以说话；听练习不依赖系统日语语音，会播放网站自带的录音。</li>
        <li>微信里打开（iPhone / iPad）：「系统设置 → 微信 → 麦克风」要打开。即便打开了，微信里的网页经常仍然不能录音。点右上角「···」→「在Safari中打开」，再用 Safari 说话。侧面静音开关会关掉朗读和网页里的声音，请拨到响铃，它不挡麦克风。</li>
        <li>微信里打开（安卓，含 vivo）：到系统「设置 → 应用 → 微信 → 权限 → 麦克风」。若网页仍不能录音或朗读，点右上角「···」→「在浏览器中打开」。本站没有微信公众号接口，不能在微信里强行打开麦克风。</li>
        <li>手机百度 / 百度浏览器：系统「设置 → 应用 → 百度（或手机百度、百度浏览器）→ 权限 → 麦克风」要打开。iPhone 是「系统设置 → 百度 → 麦克风」。点了允许但音量条不动时，点右上角菜单，用 Safari、Chrome 或 vivo 浏览器打开。</li>
      </ul>
    </section>
  )
}
