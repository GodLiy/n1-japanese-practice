import { Link } from 'react-router'
import { articles } from '../content/articles.ts'
import { listeningItems } from '../content/listening.ts'
import { readSets } from '../content/readaloud.ts'
import { roleScenarios } from '../content/roleplay.ts'
import { shadowPassages } from '../content/shadowing.ts'
import { averageBest, formatWhen } from '../lib/day.ts'
import { modeLabel } from '../lib/labels.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useStore } from '../lib/useStore.ts'
import type { Mode } from '../types.ts'

const groups: { mode: Mode; title: string; rows: { id: string; title: string; to: string }[] }[] = [
  { mode: 'listen', title: '听解', rows: listeningItems.map((item) => ({ id: item.id, title: item.title, to: `/listen/${item.id}` })) },
  { mode: 'shadow', title: '跟读', rows: shadowPassages.map((item) => ({ id: item.id, title: item.title, to: `/speak/shadow/${item.id}` })) },
  { mode: 'role', title: '应对', rows: roleScenarios.map((item) => ({ id: item.id, title: item.title, to: `/speak/role/${item.id}` })) },
  { mode: 'read', title: '朗读', rows: readSets.map((item) => ({ id: item.id, title: item.title, to: `/speak/read/${item.id}` })) },
  { mode: 'article', title: '阅读', rows: articles.map((item) => ({ id: item.id, title: item.title, to: `/reading/${item.id}` })) },
]

export function ProgressPage() {
  usePageTitle('记录')
  const { state, getRecord } = useStore()
  return (
    <section>
      <p className="eyebrow">只在这台浏览器</p>
      <h1>记录</h1>
      <p className="lede">
        连续 {state.streak.count} 天。听解均分 {averageBest(state.records, 'listen:') ?? '—'}，阅读 {averageBest(state.records, 'article:') ?? '—'}，跟读 {averageBest(state.records, 'shadow:') ?? '—'}，应对 {averageBest(state.records, 'role:') ?? '—'}，朗读 {averageBest(state.records, 'read:') ?? '—'}。
      </p>
      {groups.map((group) => {
        const done = group.rows.filter((row) => getRecord(group.mode, row.id)?.attempts).length
        return (
          <section key={group.mode} className="progress-block">
            <h2>{group.title} · {done} / {group.rows.length}</h2>
            <ul className="progress-list">
              {group.rows.map((row) => {
                const record = getRecord(group.mode, row.id)
                const best = record?.best ?? 0
                return (
                  <li key={row.id}>
                    <Link to={row.to}>
                      <span>{row.title}</span>
                      <span className="bar" aria-hidden="true"><span style={{ width: `${best}%` }} /></span>
                      <strong className="num">{record ? best : '—'}</strong>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
      <h2>最近</h2>
      {state.activity.length === 0 ? (
        <p className="muted">还没有成绩。</p>
      ) : (
        <ul className="activity">
          {state.activity.map((item) => (
            <li key={`${item.at}-${item.mode}-${item.id}`}>
              <span>{formatWhen(item.at)}</span>
              <span>{modeLabel[item.mode]}</span>
              <span>{item.title}</span>
              <strong className="num">{item.score}</strong>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
