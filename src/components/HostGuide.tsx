import { useEffect, useState } from 'react'
import { isAppleTouch, isWeChat } from '../lib/device.ts'
import { dismissHostGuide, subscribeHostGuide } from '../lib/host-guide.ts'
import type { GuideReason } from '../lib/host-guide.ts'

export function HostGuide() {
  const [reason, setReason] = useState<GuideReason | null>(null)

  useEffect(() => subscribeHostGuide(setReason), [])

  if (!reason || !isWeChat()) return null
  const apple = isAppleTouch()

  return (
    <div className="host-guide" role="dialog" aria-modal="true" aria-labelledby="host-guide-title">
      <div className="paper host-guide-card">
        <h2 id="host-guide-title">{reason === 'speak' ? '微信里说不了话' : '微信里听不到声音'}</h2>
        {reason === 'speak' ? (
          <p>这个网页拿不到麦克风。微信自己的网页经常会拦住录音，本站没有微信公众号接口，不能替你打开。</p>
        ) : (
          <p>这段录音没有播出来。微信里的网页有时要在你点击之后才允许出声。再点一次播放；若仍然没有声音，用系统浏览器打开。</p>
        )}
        <ol className="support-list">
          {apple ? (
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
