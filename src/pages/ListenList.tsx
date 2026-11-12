import { Catalog } from '../components/Catalog.tsx'
import { listeningItems } from '../content/listening.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function ListenList() {
  usePageTitle('听解')
  return (
    <section>
      <p className="eyebrow">听</p>
      <h1>听解</h1>
      <p className="lede">一次一篇。标题只标场景和话题，方便挑选。要听的那一点，打开之后才出现。带下划线的词可以点开。</p>
      <Catalog
        label="听解"
        mode="listen"
        items={listeningItems.map((item) => ({
          id: item.id,
          title: item.title,
          titleJa: item.titleJa,
          domain: item.domain,
          meta: `${item.kind === 'dialogue' ? '对话' : '独白'} · ${item.minutes}`,
          to: `/listen/${item.id}`,
          blurb: item.summaryZh ?? item.focusZh,
          sourceZh: item.sourceZh,
          newsDate: item.newsDate,
        }))}
      />
    </section>
  )
}
