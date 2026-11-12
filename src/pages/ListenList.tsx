import { Catalog } from '../components/Catalog.tsx'
import { listeningItems } from '../content/listening.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'

export function ListenList() {
  usePageTitle('听解')
  return (
    <section>
      <p className="eyebrow">听</p>
      <h1>听解</h1>
      <p className="lede">一次一篇。先听，再答题，最后才打开原文和词。问题用日语，解释用中文。</p>
      <Catalog
        mode="listen"
        items={listeningItems.map((item) => ({
          id: item.id,
          title: item.title,
          domain: item.domain,
          meta: `${item.kind === 'dialogue' ? '对话' : '独白'} · ${item.minutes}`,
          to: `/listen/${item.id}`,
          blurb: item.focusZh,
        }))}
      />
    </section>
  )
}
