import { useEffect, useState } from 'react'
import { isAppleTouch } from '../lib/device.ts'
import { dismissHostGuide, subscribeHostGuide } from '../lib/host-guide.ts'
import type { GuideNotice } from '../lib/host-guide.ts'

export function HostGuide() {
  const [guide, setGuide] = useState<GuideNotice | null>(null)

  useEffect(() => subscribeHostGuide(setGuide), [])

  if (!guide) return null
  const apple = isAppleTouch()
  const baidu = guide.host === 'baidu'

  return (
    <div className="host-guide" role="dialog" aria-modal="true" aria-labelledby="host-guide-title">
      <div className="paper host-guide-card">
        <h2 id="host-guide-title">
          {baidu ? '百度里没有录到声音' : guide.reason === 'speak' ? '微信里说不了话' : '微信里听不到声音'}
        </h2>
        {baidu ? (
          <p>网页没有拿到可用的麦克风声音。可能是百度拒绝了权限，也可能是点了允许却没有把声音传进来。系统里百度的麦克风要打开。这个页面会直接录音，再用本机模型转成日语，不依赖百度的识别。</p>
        ) : guide.reason === 'speak' ? (
          <p>这个网页拿不到麦克风。微信自己的网页经常会拦住录音，本站没有微信公众号接口，不能替你打开。</p>
        ) : (
          <p>这段录音没有播出来。微信里的网页有时要在你点击之后才允许出声。再点一次播放；若仍然没有声音，用系统浏览器打开。</p>
        )}
        <ol className="support-list">
          {baidu ? (
            apple ? (
              <>
                <li>iPhone / iPad：打开「系统设置 → 百度 → 麦克风」。侧面静音开关不挡麦克风，但会关掉朗读。</li>
                <li>然后点本页右上角「···」→「在Safari中打开」，再用 Safari 说话。</li>
              </>
            ) : (
              <>
                <li>安卓：打开系统「设置 → 应用 → 百度（手机百度或百度浏览器）→ 权限 → 麦克风」。</li>
                <li>回到本页再点一次「说话」。若音量条仍不动，点百度右上角菜单 →「在浏览器中打开」，用 vivo 浏览器或 Chrome。</li>
              </>
            )
          ) : apple ? (
            <>
              <li>iPhone / iPad：打开「系统设置 → 微信 → 麦克风」。侧面静音开关会关掉朗读和网页里的声音，请拨到响铃。静音开关不挡麦克风。</li>
              <li>然后点本页右上角「···」→「在Safari中打开」，再用 Safari 听和说。</li>
            </>
          ) : (
            <>
              <li>安卓：打开系统「设置 → 应用 → 微信 → 权限 → 麦克风」。</li>
              <li>然后点本页右上角「···」→「在浏览器中打开」。vivo 浏览器里，听练习会用网站自带的日语录音。</li>
            </>
          )}
          <li>句子也可以直接打在输入框里评分，不需要麦克风。</li>
        </ol>
        <div className="end-actions">
          <button type="button" className="btn primary" onClick={dismissHostGuide}>
            知道了
          </button>
        </div>
      </div>
    </div>
  )
}
