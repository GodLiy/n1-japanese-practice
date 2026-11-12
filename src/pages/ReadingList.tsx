import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { articles } from '../content/articles.ts'
import { domainLabel, domainOrder, levelLabel } from '../lib/labels.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useStore } from '../lib/useStore.ts'
import type { ArticleLevel, Domain } from '../types.ts'

export function ReadingList() {
  usePageTitle('阅读')
  const { getRecord } = useStore()
  const present = domainOrder.filter((topic) => articles.some((item) => item.topic === topic))
  const [topic, setTopic] = useState<Domain | 'all'>('all')
  const [level, setLevel] = useState<ArticleLevel | 'all'>('all')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      articles.filter((item) => {
        if (topic !== 'all' && item.topic !== topic) return false
        if (level !== 'all' && item.level !== level) return false
        if (!needle) return true
        const hay = `${item.title} ${item.titleJa ?? ''} ${item.leadZh} ${item.sourceZh ?? ''}`.toLowerCase()
        return hay.includes(needle)
      }),
    [topic, level, needle],
  )
  const groups = present.filter((item) => visible.some((entry) => entry.topic === item))

  return (
    <section>
      <p className="eyebrow">读</p>
      <h1>阅读</h1>
      <p className="lede">
        一篇一篇读。标题写明主题。读完回答大意、细节、作者意图、推断和词在文中的意思。带下划线的词可以点开，收入生词本。稿子是改写的，不是媒体原文。
      </p>
      <label className="search">
        <span>搜索</span>
        <input type="search" value={query} placeholder="标题或出处" aria-label="搜索文章" onChange={(event) => setQuery(event.target.value)} />
      </label>
      <div className="chips" role="tablist" aria-label="按主题筛选">
        <button type="button" className={topic === 'all' ? 'chip is-on' : 'chip'} onClick={() => setTopic('all')}>全部</button>
        {present.map((item) => (
          <button key={item} type="button" className={topic === item ? 'chip is-on' : 'chip'} onClick={() => setTopic(item)}>
            {domainLabel[item]}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="按难度筛选">
        <button type="button" className={level === 'all' ? 'chip is-on' : 'chip'} onClick={() => setLevel('all')}>全部难度</button>
        <button type="button" className={level === 'n1' ? 'chip is-on' : 'chip'} onClick={() => setLevel('n1')}>N1</button>
        <button type="button" className={level === 'n1plus' ? 'chip is-on' : 'chip'} onClick={() => setLevel('n1plus')}>N1 以后</button>
      </div>
      {groups.map((group) => (
        <section key={group}>
          <h2>阅读 · {domainLabel[group]}</h2>
          <ul className="item-list">
            {visible.filter((item) => item.topic === group).map((item) => {
              const record = getRecord('article', item.id)
              return (
                <li key={item.id}>
                  <Link to={`/reading/${item.id}`} className="item-row">
                    <span className="item-kicker">
                      {domainLabel[item.topic]} · {levelLabel[item.level]} · {item.minutes}
                      {item.newsDate ? ` · ${item.newsDate}` : ''}
                    </span>
                    <span className="item-title">{item.title}</span>
                    {item.titleJa ? <span className="item-ja jp-ui">{item.titleJa}</span> : null}
                    <span className="item-blurb">{item.leadZh}</span>
                    <span className="item-score num">{record ? `最好 ${record.best}` : '未练习'}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {visible.length === 0 ? <p className="muted">没有符合的文章。</p> : null}
    </section>
  )
}
