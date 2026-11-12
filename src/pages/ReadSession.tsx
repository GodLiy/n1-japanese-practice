import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router'
import { AttemptBox } from '../components/AttemptBox.tsx'
import { DiffView } from '../components/DiffView.tsx'
import { Missing } from '../components/Missing.tsx'
import { PlayBar } from '../components/PlayBar.tsx'
import { LookupText } from '../components/LookupText.tsx'
import { ScoreRing } from '../components/ScoreRing.tsx'
import { getReadSet, readSets } from '../content/readaloud.ts'
import { domainLabel } from '../lib/labels.ts'
import { scoreBand, similarity } from '../lib/score.ts'
import { useRecognizer } from '../lib/useRecognizer.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'
import type { ReadSet } from '../types.ts'

export function ReadSession() {
  const { id } = useParams()
  const item = getReadSet(id ?? '')
  if (!item) return <Missing to="/speak" label="回口语" />
  return <ReadPlayer key={item.id} item={item} />
}

function ReadPlayer({ item }: { item: ReadSet }) {
  usePageTitle(item.title)
  const { state, recordResult } = useStore()
  const speech = useSpeech()
  const rec = useRecognizer()
  const [index, setIndex] = useState(0)
  const [scores, setScores] = useState<(number | null)[]>(() => item.sentences.map(() => null))
  const [done, setDone] = useState(false)
  const [savedScore, setSavedScore] = useState<number | null>(null)
  const sentence = item.sentences[index]
  const listIndex = readSets.findIndex((entry) => entry.id === item.id)
  const next = readSets[listIndex + 1]
  const live = useMemo(() => (rec.text.trim() && sentence ? similarity(sentence.text, rec.text) : null), [rec.text, sentence])
  const band = live === null ? null : scoreBand(live)

  function commit(text: string, sentenceIndex: number) {
    if (!text.trim()) return
    const value = similarity(item.sentences[sentenceIndex]?.text ?? '', text)
    setScores((prev) => {
      const nextScores = [...prev]
      nextScores[sentenceIndex] = Math.max(nextScores[sentenceIndex] ?? 0, value)
      return nextScores
    })
  }

  function finish() {
    const finalScores = scores.map((value, scoreIndex) => {
      if (scoreIndex === index && rec.text.trim()) {
        return Math.max(value ?? 0, similarity(item.sentences[scoreIndex]?.text ?? '', rec.text))
      }
      return value
    })
    const average = Math.round(finalScores.reduce<number>((sum, value) => sum + (value ?? 0), 0) / finalScores.length)
    setScores(finalScores)
    setSavedScore(average)
    setDone(true)
    recordResult('read', item.id, item.title, average)
  }

  if (!sentence) return null

  return (
    <article className="session">
      <div className="session-nav">
        <Link to="/speak" className="back">口语</Link>
        <span className="num">{listIndex + 1} / {readSets.length}</span>
      </div>
      <p className="eyebrow">{domainLabel[item.domain]} · 朗读</p>
      <h1>{item.title}</h1>
      {item.titleJa ? <p className="title-ja jp-ui">{item.titleJa}</p> : null}
      {item.newsDate || item.sourceZh ? <p className="fine">{[item.newsDate, item.sourceZh].filter(Boolean).join(' · ')}</p> : null}
      <p className="focus">{item.summaryZh ?? item.focusZh}</p>
      {item.summaryZh ? <p className="notice">{item.focusZh}</p> : null}
      <p className="fine">语音识别听不出升降。这里的分数只表示字面。高低请对照播放，自己听。</p>
      {done ? (
        <section className="paper inset">
          <div className="score-row">
            <ScoreRing score={savedScore ?? 0} />
            <div>
              <h2>{scoreBand(savedScore ?? 0).title}</h2>
              <p>这是字面接近程度，不是音高分。没读的句子按 0 分计入。</p>
            </div>
          </div>
          <ol className="chunk-scores">
            {item.sentences.map((entry, sentenceIndex) => (
              <li key={entry.text}>
                <span className="num">{scores[sentenceIndex] ?? 0}</span>
                <span>
                  <LookupText value={entry.text} furigana={state.settings.furigana} />
                  <small className="notice">{entry.noteZh}</small>
                </span>
              </li>
            ))}
          </ol>
          <div className="end-actions">
            {next ? <Link to={`/speak/read/${next.id}`} className="btn primary">下一组</Link> : <Link to="/speak" className="btn primary">回口语</Link>}
          </div>
        </section>
      ) : (
        <>
          <div className="dots">
            {item.sentences.map((_, sentenceIndex) => (
              <button
                key={sentenceIndex}
                type="button"
                className={sentenceIndex === index ? 'dot is-on' : 'dot'}
                onClick={() => {
                  commit(rec.text, index)
                  rec.setText('')
                  speech.stop()
                  setIndex(sentenceIndex)
                }}
              >
                {sentenceIndex + 1}
              </button>
            ))}
          </div>
          <section className="paper inset">
            <p className="item-kicker">{index + 1} / {item.sentences.length}</p>
            <p className="script">
              <LookupText value={sentence.text} furigana={state.settings.furigana} />
            </p>
            <p className="notice">{sentence.noteZh}</p>
            <PlayBar lines={[{ text: sentence.text, slot: 0 }]} label="听这一句" />
          </section>
          <AttemptBox
            listening={rec.listening}
            text={rec.text}
            error={rec.error}
            supported={rec.supported}
            canRecord={rec.canRecord}
            secure={rec.secure}
            inputMode={rec.inputMode}
            audioUrl={rec.audioUrl}
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
              <DiffView target={sentence.text} heard={rec.text} />
            </section>
          ) : null}
          <div className="end-actions">
            <button type="button" className="btn" onClick={() => rec.setText('')}>清空重读</button>
            {index + 1 < item.sentences.length ? (
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
                下一句
              </button>
            ) : (
              <button type="button" className="btn primary" onClick={finish}>看总分并保存</button>
            )}
          </div>
        </>
      )}
    </article>
  )
}
