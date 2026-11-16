import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { articles } from '../content/articles.ts'
import { dictionary } from '../content/dictionary.ts'
import { listeningItems } from '../content/listening.ts'
import { readSets } from '../content/readaloud.ts'
import { roleScenarios } from '../content/roleplay.ts'
import { shadowPassages } from '../content/shadowing.ts'
import { dictTopicLabel, domainLabel, domainOrder } from '../lib/labels.ts'
import { kataToHira } from '../lib/score.ts'
import type { DictTopic, Domain } from '../types.ts'

type ModuleId = 'all' | 'listen' | 'speak' | 'read' | 'word'

type Hit = {
  key: string
  href: string
  moduleLabel: string
  topicLabel: string
  date?: string
  title: string
  blurb: string
  domain?: Domain
  dictTopic?: DictTopic
  hay: string
}

const moduleOptions: { id: ModuleId; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'listen', label: '听力' },
  { id: 'speak', label: '口语' },
  { id: 'read', label: '阅读' },
  { id: 'word', label: '词汇' },
]

const dictForDomain: Partial<Record<Domain, DictTopic>> = {
  politics: 'politics',
  economy: 'economy',
  society: 'society',
  tech: 'tech',
  culture: 'culture',
  entertainment: 'culture',
  food: 'culture',
  daily: 'life',
}

function fold(value: string): string {
  return kataToHira(value.normalize('NFKC').trim().toLowerCase())
}

function clip(value: string): string {
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean.length > 72 ? `${clean.slice(0, 72)}…` : clean
}

export function HomeSearch() {
  const [query, setQuery] = useState('')
  const [moduleId, setModuleId] = useState<ModuleId>('all')
  const [topic, setTopic] = useState<Domain | 'all'>('all')
  const [date, setDate] = useState('all')
  const needle = fold(query)

  const { hits, dates, topics } = useMemo(() => {
    const rows: Hit[] = []
    for (const item of listeningItems) {
      rows.push({
        key: `listen-${item.id}`,
        href: `/listen/${item.id}`,
        moduleLabel: '听力',
        topicLabel: domainLabel[item.domain],
        date: item.newsDate,
        title: item.title,
        blurb: item.summaryZh ?? item.situationZh,
        domain: item.domain,
        hay: fold(`${item.title} ${item.titleJa ?? ''} ${item.summaryZh ?? ''} ${item.situationZh} ${item.sourceZh ?? ''} ${item.newsDate ?? ''}`),
      })
    }
    for (const item of shadowPassages) {
      rows.push({
        key: `shadow-${item.id}`,
        href: `/speak/shadow/${item.id}`,
        moduleLabel: '跟读',
        topicLabel: domainLabel[item.domain],
        date: item.newsDate,
        title: item.title,
        blurb: item.summaryZh ?? item.coachZh,
        domain: item.domain,
        hay: fold(`${item.title} ${item.titleJa ?? ''} ${item.summaryZh ?? ''} ${item.coachZh} ${item.sourceZh ?? ''} ${item.newsDate ?? ''}`),
      })
    }
    for (const item of roleScenarios) {
      rows.push({
        key: `role-${item.id}`,
        href: `/speak/role/${item.id}`,
        moduleLabel: '应对',
        topicLabel: domainLabel[item.domain],
        date: item.newsDate,
        title: item.title,
        blurb: item.summaryZh ?? item.situationZh,
        domain: item.domain,
        hay: fold(`${item.title} ${item.titleJa ?? ''} ${item.summaryZh ?? ''} ${item.situationZh} ${item.sourceZh ?? ''} ${item.newsDate ?? ''}`),
      })
    }
    for (const item of readSets) {
      rows.push({
        key: `read-${item.id}`,
        href: `/speak/read/${item.id}`,
        moduleLabel: '朗读',
        topicLabel: domainLabel[item.domain],
        date: item.newsDate,
        title: item.title,
        blurb: item.summaryZh ?? item.focusZh,
        domain: item.domain,
        hay: fold(`${item.title} ${item.titleJa ?? ''} ${item.summaryZh ?? ''} ${item.focusZh} ${item.sourceZh ?? ''} ${item.newsDate ?? ''}`),
      })
    }
    for (const item of articles) {
      rows.push({
        key: `article-${item.id}`,
        href: `/reading/${item.id}`,
        moduleLabel: '阅读',
        topicLabel: domainLabel[item.topic],
        date: item.newsDate,
        title: item.title,
        blurb: item.leadZh,
        domain: item.topic,
        hay: fold(`${item.title} ${item.titleJa ?? ''} ${item.leadZh} ${item.sourceZh ?? ''} ${item.newsDate ?? ''}`),
      })
    }
    for (const entry of dictionary) {
      rows.push({
        key: `word-${entry.id}`,
        href: `/words?q=${encodeURIComponent(entry.word)}`,
        moduleLabel: '词汇',
        topicLabel: dictTopicLabel[entry.topic],
        title: entry.word,
        blurb: entry.meaningZh,
        dictTopic: entry.topic,
        hay: fold(`${entry.word} ${entry.reading} ${entry.meaningZh} ${entry.senses.map((sense) => sense.meaningZh).join(' ')}`),
      })
    }
    const dateSet = new Set<string>()
    const topicSet = new Set<Domain>()
    for (const row of rows) {
      if (row.date) dateSet.add(row.date)
      if (row.domain) topicSet.add(row.domain)
    }
    return {
      hits: rows,
      dates: [...dateSet].sort((a, b) => b.localeCompare(a)),
      topics: domainOrder.filter((item) => topicSet.has(item)),
    }
  }, [])

  const active = needle.length > 0 || moduleId !== 'all' || topic !== 'all' || date !== 'all'
  const visible = hits.filter((hit) => {
    if (moduleId === 'listen' && hit.moduleLabel !== '听力') return false
    if (moduleId === 'speak' && !['跟读', '应对', '朗读'].includes(hit.moduleLabel)) return false
    if (moduleId === 'read' && hit.moduleLabel !== '阅读') return false
    if (moduleId === 'word' && hit.moduleLabel !== '词汇') return false
    if (date !== 'all' && hit.date !== date) return false
    if (topic !== 'all') {
      if (hit.domain) {
        if (hit.domain !== topic) return false
      } else if (hit.dictTopic) {
        if (dictForDomain[topic] !== hit.dictTopic) return false
      }
    }
    if (needle && !hit.hay.includes(needle)) return false
    return true
  })
  const shown = visible.slice(0, 24)

  return (
    <section className="paper note-card home-search" aria-label="搜索练习">
      <h2>查找</h2>
      <p className="muted">在听力、口语、阅读和词汇里搜。可以按主题和日期收窄。标题只显示场景。</p>
      <label className="search">
        <span>搜索</span>
        <input
          type="search"
          value={query}
          placeholder="标题、词或中文"
          aria-label="搜索听力、口语、阅读和词汇"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="chips" role="tablist" aria-label="按模块筛选">
        {moduleOptions.map((item) => (
          <button
            key={item.id}
            type="button"
            className={moduleId === item.id ? 'chip is-on' : 'chip'}
            onClick={() => setModuleId(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="按主题筛选">
        <button type="button" className={topic === 'all' ? 'chip is-on' : 'chip'} onClick={() => setTopic('all')}>
          全部主题
        </button>
        {topics.map((item) => (
          <button key={item} type="button" className={topic === item ? 'chip is-on' : 'chip'} onClick={() => setTopic(item)}>
            {domainLabel[item]}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="按日期筛选">
        <button type="button" className={date === 'all' ? 'chip is-on' : 'chip'} onClick={() => setDate('all')}>
          全部日期
        </button>
        {dates.map((item) => (
          <button key={item} type="button" className={date === item ? 'chip is-on' : 'chip'} onClick={() => setDate(item)}>
            {item}
          </button>
        ))}
      </div>
      {active ? (
        <>
          <p className="fine" aria-live="polite">
            {visible.length} 条{visible.length > shown.length ? `，先显示 ${shown.length} 条` : ''}
          </p>
          {shown.length === 0 ? (
            <p className="muted">没有符合的练习或词。换一个主题，或把词写得再短一些。</p>
          ) : (
            <ul className="item-list">
              {shown.map((hit) => (
                <li key={hit.key}>
                  <Link to={hit.href} className="item-row">
                    <span className="item-kicker">
                      {hit.moduleLabel} · {hit.topicLabel}
                      {hit.date ? ` · ${hit.date}` : ''}
                    </span>
                    <span className="item-title">{hit.title}</span>
                    <span className="item-blurb">{clip(hit.blurb)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="fine">输入一个词，或先选听力、口语、阅读、词汇。</p>
      )}
    </section>
  )
}
