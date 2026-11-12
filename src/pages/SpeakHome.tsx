import { useEffect } from 'react'
import { Link, useSearchParams } from 'react-router'
import { isAppleTouch, isBaidu, isWeChat } from '../lib/device.ts'
import { Catalog } from '../components/Catalog.tsx'
import { readSets } from '../content/readaloud.ts'
import { roleScenarios } from '../content/roleplay.ts'
import { shadowPassages } from '../content/shadowing.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function SpeakHome() {
  usePageTitle('说')
  const [params] = useSearchParams()
  const focus = params.get('focus')
  useEffect(() => {
    if (!focus) return
    document.getElementById(focus)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [focus])
  return (
    <section className="speak-home">
      <p className="eyebrow">说</p>
      <h1>跟读、应对、朗读</h1>
      <p className="lede">
        每条标题写明场合。iPhone、iPad、安卓和电脑都可以朗读和说话。浏览器没识别出来时，会用下载到本机的日语模型再听一遍。麦克风权限在 <Link to="/settings">设置</Link> 里。句调本身不会被打分。稿子里带下划线的词可以点开。
      </p>
      {isWeChat() ? (
        <p className="form-error">
          你正在微信里打开。听可以用。说话经常被微信拦住。
          {isAppleTouch()
            ? '请打开「系统设置 → 微信 → 麦克风」，再点右上角「···」→「在Safari中打开」。侧面静音开关会关掉声音，请拨到响铃。'
            : '若不能录音或听不到，点右上角「···」→「在浏览器中打开」。'}
          句子也可以打在下面评分。
        </p>
      ) : null}
      {isBaidu() ? (
        <p className="form-error">
          你正在手机百度里打开。说话会直接录音，再用本机模型转成文字。若点了允许但没有声音，请打开系统里百度的麦克风；仍不行就点右上角菜单，用 Safari、Chrome 或 vivo 浏览器打开。
        </p>
      ) : null}

      <h2 id="shadow">跟读</h2>
      <p className="section-lead">目标是口语形。书面说法折在下面，用来看缩了什么，不要把它读回去。</p>
      <Catalog
        label="跟读"
        mode="shadow"
        items={shadowPassages.map((item) => ({
          id: item.id,
          title: item.title,
          titleJa: item.titleJa,
          domain: item.domain,
          meta: `${item.registerZh} · ${item.minutes}`,
          to: `/speak/shadow/${item.id}`,
          blurb: item.summaryZh ?? item.coachZh,
          sourceZh: item.sourceZh,
          newsDate: item.newsDate,
        }))}
      />

      <h2 id="role">应对</h2>
      <p className="section-lead">先看情境和你要覆盖的事，说完再对参考答案。分数是要点重合，不是人工批改。</p>
      <Catalog
        label="应对"
        mode="role"
        items={roleScenarios.map((item) => ({
          id: item.id,
          title: item.title,
          titleJa: item.titleJa,
          domain: item.domain,
          meta: `${item.registerZh} · ${item.minutes}`,
          to: `/speak/role/${item.id}`,
          blurb: item.summaryZh ?? item.situationZh,
          sourceZh: item.sourceZh,
          newsDate: item.newsDate,
        }))}
      />

      <h2 id="read">朗读</h2>
      <p className="section-lead">先听模范的句调，再读。分数只表示字面有多接近。音高要自己对照播放来听。</p>
      <Catalog
        label="朗读"
        mode="read"
        items={readSets.map((item) => ({
          id: item.id,
          title: item.title,
          titleJa: item.titleJa,
          domain: item.domain,
          meta: `${item.sentences.length} 句 · ${item.minutes}`,
          to: `/speak/read/${item.id}`,
          blurb: item.summaryZh ?? item.focusZh,
          sourceZh: item.sourceZh,
          newsDate: item.newsDate,
        }))}
      />
    </section>
  )
}
