import { useState } from 'react'
import { Link } from 'react-router'
import { domainLabel } from '../lib/labels.ts'
import type { Domain, Mode } from '../types.ts'
import { useStore } from '../lib/useStore.ts'

export type CatalogEntry = {
  id: string
  title: string
  domain: Domain
  meta: string
  to: string
  blurb: string
}

export function Catalog({ mode, items }: { mode: Mode; items: CatalogEntry[] }) {
  const { getRecord } = useStore()
  const domains = [...new Set(items.map((item) => item.domain))]
  const [domain, setDomain] = useState<Domain | 'all'>('all')
  const visible = domain === 'all' ? items : items.filter((item) => item.domain === domain)

  return (
    <div className="catalog">
      <div className="chips" role="tablist" aria-label="按主题筛选">
        <button type="button" className={domain === 'all' ? 'chip is-on' : 'chip'} onClick={() => setDomain('all')}>
          全部
        </button>
        {domains.map((item) => (
          <button key={item} type="button" className={domain === item ? 'chip is-on' : 'chip'} onClick={() => setDomain(item)}>
            {domainLabel[item]}
          </button>
        ))}
      </div>
      <ul className="item-list">
        {visible.map((item) => {
          const record = getRecord(mode, item.id)
          return (
            <li key={item.id}>
              <Link to={item.to} className="item-row">
                <span className="item-kicker">{domainLabel[item.domain]} · {item.meta}</span>
                <span className="item-title">{item.title}</span>
                <span className="item-blurb">{item.blurb}</span>
                <span className="item-score num">{record ? `最好 ${record.best}` : '未练习'}</span>
              </Link>
            </li>
          )
        })}
      </ul>
      {visible.length === 0 ? <p className="muted">这个主题下还没有篇目。</p> : null}
    </div>
  )
}
