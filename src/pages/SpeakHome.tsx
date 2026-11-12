import { useEffect } from 'react'
import { useSearchParams } from 'react-router'
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
        每条标题写明场合。麦克风在 Chrome 和 Edge 上最稳。Firefox 通常不能识别。识别结果永远显示出来，可以改明显的误转换再评分。句调本身不会被打分。稿子里带下划线的词可以点开。
      </p>

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
