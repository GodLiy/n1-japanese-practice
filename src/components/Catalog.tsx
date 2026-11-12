import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { domainLabel, domainOrder } from '../lib/labels.ts'
import type { Domain, Mode } from '../types.ts'
import { useStore } from '../lib/useStore.ts'

export type CatalogEntry = {
  id: string
  title: string
  titleJa?: string
  domain: Domain
  meta: string
  to: string
  blurb: string
  sourceZh?: string
  newsDate?: string
}

export function Catalog({ mode, items, label }: { mode: Mode; items: CatalogEntry[]; label: string }) {
  const { getRecord } = useStore()
  const present = domainOrder.filter((domain) => items.some((item) => item.domain === domain))
  const [domain, setDomain] = useState<Domain | 'all'>('all')
  const [query, setQuery] = useState('')
  const needle = query.trim().toLowerCase()
  const visible = useMemo(
    () =>
      items.filter((item) => {
        if (domain !== 'all' && item.domain !== domain) return false
        if (!needle) return true
        const hay = `${item.title} ${item.titleJa ?? ''} ${item.blurb} ${item.meta} ${item.sourceZh ?? ''}`.toLowerCase()
        return hay.includes(needle)
      }),
    [items, domain, needle],
  )
  const groups = present.filter((item) => visible.some((entry) => entry.domain === item))

  return (
    <div className="catalog">
      <label className="search">
        <span>搜索</span>
        <input
          type="search"
          value={query}
          placeholder="标题、主题或出处"
          aria-label={`搜索${label}`}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="chips" role="tablist" aria-label="按主题筛选">
        <button type="button" className={domain === 'all' ? 'chip is-on' : 'chip'} onClick={() => setDomain('all')}>
          全部
        </button>
        {present.map((item) => (
          <button key={item} type="button" className={domain === item ? 'chip is-on' : 'chip'} onClick={() => setDomain(item)}>
            {domainLabel[item]}
          </button>
        ))}
      </div>
      {groups.map((group) => (
        <section key={group} className="catalog-group">
          <h2>{label} · {domainLabel[group]}</h2>
          <ul className="item-list">
            {visible.filter((item) => item.domain === group).map((item) => {
              const record = getRecord(mode, item.id)
              return (
                <li key={item.id}>
                  <Link to={item.to} className="item-row">
                    <span className="item-kicker">
                      {domainLabel[item.domain]} · {item.meta}
                      {item.newsDate ? ` · ${item.newsDate}` : ''}
                    </span>
                    <span className="item-title">{item.title}</span>
                    {item.titleJa ? <span className="item-ja jp-ui">{item.titleJa}</span> : null}
                    <span className="item-blurb">{item.blurb}</span>
                    <span className="item-score num">{record ? `最好 ${record.best}` : '未练习'}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
      {visible.length === 0 ? <p className="muted">没有符合的篇目。换一个主题，或改一下搜索。</p> : null}
    </div>
  )
}
