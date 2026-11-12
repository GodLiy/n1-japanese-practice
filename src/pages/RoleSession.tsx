import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AttemptBox } from '../components/AttemptBox.tsx'
import { Missing } from '../components/Missing.tsx'
import { PlayBar } from '../components/PlayBar.tsx'
import { LookupText } from '../components/LookupText.tsx'
import { ScoreRing } from '../components/ScoreRing.tsx'
import { getRole, roleScenarios } from '../content/roleplay.ts'
import { domainLabel } from '../lib/labels.ts'
import { roleFeedback, scoreRole } from '../lib/score.ts'
import { useRecognizer } from '../lib/useRecognizer.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'
import type { RoleScenario } from '../types.ts'

export function RoleSession() {
  const { id } = useParams()
  const item = getRole(id ?? '')
  if (!item) return <Missing to="/speak" label="回口语" />
  return <RolePlayer key={item.id} item={item} />
}

function RolePlayer({ item }: { item: RoleScenario }) {
  usePageTitle(item.title)
  const { state, recordResult } = useStore()
  const speech = useSpeech()
  const rec = useRecognizer()
  const [showModel, setShowModel] = useState(false)
  const [saved, setSaved] = useState(false)
  const listIndex = roleScenarios.findIndex((entry) => entry.id === item.id)
  const next = roleScenarios[listIndex + 1]
  const result = useMemo(
    () => scoreRole(rec.text, item.points, [item.model, ...item.variants.map((variant) => variant.text)]),
    [rec.text, item],
  )
  const ready = rec.text.trim().length > 0

  return (
    <article className="session">
      <div className="session-nav">
        <Link to="/speak" className="back">口语</Link>
        <span className="num">{listIndex + 1} / {roleScenarios.length}</span>
      </div>
      <p className="eyebrow">{domainLabel[item.domain]} · {item.registerZh}</p>
      <h1>{item.title}</h1>
      {item.titleJa ? <p className="title-ja jp-ui">{item.titleJa}</p> : null}
      {item.newsDate || item.sourceZh ? <p className="fine">{[item.newsDate, item.sourceZh].filter(Boolean).join(' · ')}</p> : null}
      <section className="paper inset">
        <h2>情境</h2>
        {item.summaryZh ? <p>{item.summaryZh}</p> : null}
        <p>{item.situationZh}</p>
        <p><strong>你是</strong> {item.yourRoleZh}</p>
        <p className="item-kicker">{item.counterpartRoleZh}说</p>
        <p className="script">
          <LookupText value={item.counterpart} furigana={state.settings.furigana} />
        </p>
        <PlayBar lines={[{ text: item.counterpart, slot: 1, speaker: item.counterpartRoleZh }]} label="听对方" />
      </section>
      <section className="paper inset">
        <h2>说的时候要盖住</h2>
        <ul className="goals">
          {item.goalsZh.map((goal) => (
            <li key={goal}>{goal}</li>
          ))}
        </ul>
        <p className="fine">评分看这些要点有没有说到，也参考和参考答案的重合。换一种说法，分数会偏低。说完再对照，不必背。</p>
      </section>
      <AttemptBox
        listening={rec.listening}
        text={rec.text}
        error={rec.error}
        supported={rec.supported}
        secure={rec.secure}
        onChange={(value) => {
          setSaved(false)
          rec.setText(value)
        }}
        onMic={() => {
          if (rec.listening) rec.stop()
          else {
            speech.stop()
            rec.start()
          }
        }}
      />
      {ready ? (
        <section className="paper inset">
          <div className="score-row">
            <ScoreRing score={result.score} />
            <div>
              <h2>{result.hits.filter(Boolean).length} / {item.points.length} 个要点</h2>
              <p>{roleFeedback(result.hits)}</p>
              <p className="fine">和参考答案的字面重合大约 {result.overlap}。这不是老师批改。</p>
            </div>
          </div>
          <ul className="points">
            {item.points.map((point, pointIndex) => (
              <li key={point.labelZh} className={result.hits[pointIndex] ? 'hit' : 'miss'}>
                <span>{result.hits[pointIndex] ? '说到了' : '还没听到'}</span>
                <strong>{point.labelZh}</strong>
                {result.matched[pointIndex] ? <small className="jp-ui">听到：{result.matched[pointIndex]}</small> : null}
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn primary"
            onClick={() => {
              recordResult('role', item.id, item.title, result.score)
              setSaved(true)
              setShowModel(true)
            }}
          >
            {saved ? '已记下这次' : '记下这次成绩'}
          </button>
        </section>
      ) : null}
      <section className="paper inset">
        <div className="split-head">
          <h2>参考答案</h2>
          <button type="button" className="btn" onClick={() => setShowModel((value) => !value)}>
            {showModel ? '先收起' : '打开'}
          </button>
        </div>
        {showModel ? (
          <>
            <p className="script">
              <LookupText value={item.model} furigana={state.settings.furigana} />
            </p>
            <PlayBar lines={[{ text: item.model, slot: 0, speaker: '参考答案' }]} label="听参考答案" />
            {item.variants.map((variant) => (
              <div key={variant.labelZh} className="variant">
                <p className="item-kicker">{variant.labelZh}</p>
                <p lang="ja"><LookupText value={variant.text} furigana={state.settings.furigana} /></p>
              </div>
            ))}
            <h2>语体</h2>
            <p>{item.coachZh}</p>
            {item.relatedId ? (
              <p>
                <Link to={`/speak/role/${item.relatedId}`}>{item.relatedLabel}</Link>
              </p>
            ) : null}
          </>
        ) : (
          <p className="muted">先说一遍再打开，比较有用。浏览器不能识别时，也可以先打开，再把自己的话打进去。</p>
        )}
      </section>
      <div className="end-actions">
        {next ? <Link to={`/speak/role/${next.id}`} className="btn">下一个情境</Link> : <Link to="/speak" className="btn">回口语</Link>}
      </div>
    </article>
  )
}
