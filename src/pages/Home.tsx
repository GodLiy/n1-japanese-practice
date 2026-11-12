import { useState } from 'react'
import { Link } from 'react-router'
import { listeningItems } from '../content/listening.ts'
import { readSets } from '../content/readaloud.ts'
import { roleScenarios } from '../content/roleplay.ts'
import { shadowPassages } from '../content/shadowing.ts'
import { averageBest, formatWhen, suggestId } from '../lib/day.ts'
import { modeLabel } from '../lib/labels.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useStore } from '../lib/useStore.ts'

const speakPools = [
  { mode: 'shadow' as const, items: shadowPassages, salt: 1 },
  { mode: 'role' as const, items: roleScenarios, salt: 2 },
  { mode: 'read' as const, items: readSets, salt: 3 },
]

export function Home() {
  usePageTitle('聴話')
  const { state, getRecord } = useStore()
  const masteredListen = new Set(
    listeningItems.filter((item) => (getRecord('listen', item.id)?.best ?? 0) >= 80).map((item) => item.id),
  )
  const listenId = suggestId(
    listeningItems.map((item) => item.id),
    masteredListen,
    0,
  )
  const listen = listeningItems.find((item) => item.id === listenId) ?? listeningItems[0]
  const [poolIndex] = useState(() => new Date().getDate() % speakPools.length)
  const pool = speakPools[poolIndex] ?? speakPools[0]
  const speakItems = pool.items
  const masteredSpeak = new Set(
    speakItems.filter((item) => (getRecord(pool.mode, item.id)?.best ?? 0) >= 80).map((item) => item.id),
  )
  const speakId = suggestId(
    speakItems.map((item) => item.id),
    masteredSpeak,
    pool.salt,
  )
  const speak = speakItems.find((item) => item.id === speakId) ?? speakItems[0]
  const listenAvg = averageBest(state.records, 'listen:')
  const speakAvg = averageBest(
    Object.fromEntries(Object.entries(state.records).filter(([key]) => !key.startsWith('listen:'))),
    '',
  )
  const done = Object.values(state.records).filter((record) => record.attempts > 0).length
  const sentenceCount = readSets.reduce((total, set) => total + set.sentences.length, 0)

  return (
    <div className="home">
      <section className="hero">
        <div>
          <p className="eyebrow">N1 之后</p>
          <h1>听的时候不被表面句式带走，说的时候把语体说对。</h1>
          <p className="lede">
            给已经通过 N1 的人。新闻和评论、会议敬语、学术短讲、访谈、投诉和交涉。不设单词本，不设语法课。阅读只在听完或说完之后用来核对。
          </p>
        </div>
        <div className="enso" aria-hidden="true" />
      </section>

      <section className="stat-row" aria-label="练习概况">
        <article className="stat">
          <span>连续</span>
          <strong className="num">{state.streak.count}</strong>
          <small>{state.streak.count > 0 ? '天里做过一篇' : '还没有连续记录'}</small>
        </article>
        <article className="stat">
          <span>做过</span>
          <strong className="num">{done}</strong>
          <small>篇有成绩</small>
        </article>
        <article className="stat">
          <span>听解最好均分</span>
          <strong className="num">{listenAvg ?? '—'}</strong>
          <small>{listenAvg === null ? '做完一篇才会出现' : '按各篇最好成绩'}</small>
        </article>
        <article className="stat">
          <span>口语最好均分</span>
          <strong className="num">{speakAvg ?? '—'}</strong>
          <small>{speakAvg === null ? '跟读、应对或朗读' : '跟读、应对、朗读'}</small>
        </article>
      </section>

      <section>
        <h2>今天建议</h2>
        <div className="today-grid">
          <Link to={`/listen/${listen.id}`} className="paper card-link">
            <span className="item-kicker">听解 · {listen.minutes}</span>
            <strong>{listen.title}</strong>
            <p>{listen.focusZh}</p>
            <span className="go">开始听</span>
          </Link>
          <Link to={`/speak/${pool.mode}/${speak.id}`} className="paper card-link">
            <span className="item-kicker">{modeLabel[pool.mode]} · {speak.minutes}</span>
            <strong>{speak.title}</strong>
            <p>{'coachZh' in speak ? speak.coachZh : speak.focusZh}</p>
            <span className="go">开始说</span>
          </Link>
        </div>
      </section>

      <section>
        <h2>练习</h2>
        <div className="tiles">
          <Link to="/listen" className="tile">
            <span>听解</span>
            <strong>{listeningItems.length} 篇</strong>
            <p>要旨、细节、态度、言外之意。听完再看原文。</p>
          </Link>
          <Link to="/speak?focus=shadow" className="tile">
            <span>跟读</span>
            <strong>{shadowPassages.length} 段</strong>
            <p>新闻、敬语、缩约、拒绝之前的那一拍。</p>
          </Link>
          <Link to="/speak?focus=role" className="tile">
            <span>应对</span>
            <strong>{roleScenarios.length} 个情境</strong>
            <p>会议、投诉、交涉。正式和随意对照着说。</p>
          </Link>
          <Link to="/speak?focus=read" className="tile">
            <span>朗读</span>
            <strong>{sentenceCount} 句</strong>
            <p>句调、对比重音、长定语和引用。分数只核字面。</p>
          </Link>
        </div>
      </section>

      <section className="paper note-card">
        <h2>一轮怎么走</h2>
        <ol className="steps">
          <li>先听完或跟完，再打开原文和参考答案。</li>
          <li>口语看识别稿和目标差在哪。识别错了可以改字，再评分。</li>
          <li>成绩写在这台浏览器。换设备、换浏览器，记录不会跟着走。</li>
        </ol>
      </section>

      <section>
        <h2>最近</h2>
        {state.activity.length === 0 ? (
          <p className="muted">做完一篇，这里会留下时间和分数。</p>
        ) : (
          <ul className="activity">
            {state.activity.slice(0, 5).map((item) => (
              <li key={`${item.at}-${item.id}`}>
                <span>{formatWhen(item.at)}</span>
                <span>{modeLabel[item.mode]}</span>
                <span>{item.title}</span>
                <strong className="num">{item.score}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
