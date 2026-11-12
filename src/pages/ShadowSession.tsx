import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AttemptBox } from '../components/AttemptBox.tsx'
import { DiffView } from '../components/DiffView.tsx'
import { Missing } from '../components/Missing.tsx'
import { PlayBar } from '../components/PlayBar.tsx'
import { RubyText } from '../components/RubyText.tsx'
import { ScoreRing } from '../components/ScoreRing.tsx'
import { getShadow, shadowPassages } from '../content/shadowing.ts'
import { domainLabel } from '../lib/labels.ts'
import { scoreBand, similarity } from '../lib/score.ts'
import { useRecognizer } from '../lib/useRecognizer.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'
import type { ShadowPassage } from '../types.ts'

export function ShadowSession() {
  const { id } = useParams()
  const item = getShadow(id ?? '')
  if (!item) return <Missing to="/speak" label="回口语" />
  return <ShadowPlayer key={item.id} item={item} />
}

function ShadowPlayer({ item }: { item: ShadowPassage }) {
  usePageTitle(item.title)
  const { state, recordResult } = useStore()
  const speech = useSpeech()
  const rec = useRecognizer()
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState<(number | null)[]>(() => item.chunks.map(() => null))
  const [done, setDone] = useState(false)
  const [savedScore, setSavedScore] = useState<number | null>(null)
  const chunk = item.chunks[index]
  const listIndex = shadowPassages.findIndex((entry) => entry.id === item.id)
  const next = shadowPassages[listIndex + 1]
  const live = useMemo(() => (rec.text.trim() ? similarity(chunk?.spoken ?? '', rec.text) : null), [chunk, rec.text])
  const band = live === null ? null : scoreBand(live)

  function commit(text: string, chunkIndex: number) {
    if (!text.trim()) return
    const value = similarity(item.chunks[chunkIndex]?.spoken ?? '', text)
    setScores((prev) => {
      const nextScores = [...prev]
      nextScores[chunkIndex] = Math.max(nextScores[chunkIndex] ?? 0, value)
      return nextScores
    })
  }

  function finish() {
    commit(rec.text, index)
    const finalScores = scores.map((value, scoreIndex) => {
      if (scoreIndex === index && rec.text.trim()) return Math.max(value ?? 0, similarity(item.chunks[scoreIndex]?.spoken ?? '', rec.text))
      return value
    })
    const numeric = finalScores.map((value) => value ?? 0)
    const average = Math.round(numeric.reduce((sum, value) => sum + value, 0) / numeric.length)
    setScores(finalScores)
    setSavedScore(average)
    setDone(true)
    recordResult('shadow', item.id, item.title, average)
  }

  if (!chunk) return null

  return (
    <article className="session">
      <div className="session-nav">
        <Link to="/speak" className="back">口语</Link>
        <span className="num">{listIndex + 1} / {shadowPassages.length}</span>
      </div>
      <p className="eyebrow">{domainLabel[item.domain]} · {item.registerZh} · 跟读</p>
      <h1>{item.title}</h1>
      <p className="focus">{item.coachZh}</p>

      {done ? (
        <section className="paper inset">
          <div className="score-row">
            <ScoreRing score={savedScore ?? 0} />
            <div>
              <h2>{scoreBand(savedScore ?? 0).title}</h2>
              <p>{scoreBand(savedScore ?? 0).detail}</p>
              <p className="fine">没读的小段按 0 分计入。成绩已保存。</p>
            </div>
          </div>
          <ol className="chunk-scores">
            {item.chunks.map((entry, chunkIndex) => (
              <li key={chunkIndex}>
                <span className="num">{scores[chunkIndex] ?? 0}</span>
                <RubyText value={entry.spoken} furigana={state.settings.furigana} />
              </li>
            ))}
          </ol>
          <div className="end-actions">
            {next ? <Link to={`/speak/shadow/${next.id}`} className="btn primary">下一段</Link> : <Link to="/speak" className="btn primary">回口语</Link>}
          </div>
        </section>
      ) : (
        <>
          <div className="dots" role="tablist" aria-label="小段">
            {item.chunks.map((_, chunkIndex) => (
              <button
                key={chunkIndex}
                type="button"
                className={chunkIndex === index ? 'dot is-on' : 'dot'}
                onClick={() => {
                  commit(rec.text, index)
                  rec.setText('')
                  speech.stop()
                  setIndex(chunkIndex)
                }}
              >
                {chunkIndex + 1}
              </button>
            ))}
          </div>
          <section className="paper inset">
            <p className="item-kicker">口语目标 · {index + 1} / {item.chunks.length}</p>
            <p className="script">
              <RubyText value={chunk.spoken} furigana={state.settings.furigana} />
            </p>
            <p className="notice">{chunk.noticeZh}</p>
            <details>
              <summary>书面说法</summary>
              <p>
                <RubyText value={chunk.written} furigana={state.settings.furigana} />
              </p>
            </details>
            <PlayBar lines={[{ text: chunk.spoken, slot: 0 }]} label="听这一小段" />
          </section>
          <AttemptBox
            listening={rec.listening}
            text={rec.text}
            error={rec.error}
            supported={rec.supported}
            secure={rec.secure}
            onChange={rec.setText}
            onMic={() => {
              if (rec.listening) rec.stop()
              else {
                speech.stop()
                rec.start()
              }
            }}
          />
          {live !== null && band ? (
            <section className="paper inset">
              <div className="score-row">
                <ScoreRing score={live} />
                <div>
                  <h2>{band.title}</h2>
                  <p>{band.detail}</p>
                </div>
              </div>
              <DiffView target={chunk.spoken} heard={rec.text} />
            </section>
          ) : null}
          <div className="end-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                rec.setText('')
                speech.stop()
              }}
            >
              清空重说
            </button>
            {index + 1 < item.chunks.length ? (
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  commit(rec.text, index)
                  rec.setText('')
                  speech.stop()
                  setIndex(index + 1)
                }}
              >
                下一小段
              </button>
            ) : (
              <button type="button" className="btn primary" onClick={finish}>
                看总分并保存
              </button>
            )}
          </div>
        </>
      )}
    </article>
  )
}
