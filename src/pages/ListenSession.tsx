import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Missing } from '../components/Missing.tsx'
import { PlayBar } from '../components/PlayBar.tsx'
import { RubyText } from '../components/RubyText.tsx'
import { ScoreRing } from '../components/ScoreRing.tsx'
import { getListening, listeningItems } from '../content/listening.ts'
import { domainLabel, questionTypeLabel } from '../lib/labels.ts'
import { listenBand } from '../lib/score.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import type { SpeakLine } from '../lib/speech-context.ts'
import { useStore } from '../lib/useStore.ts'
import type { ListeningItem, SpeakerLine } from '../types.ts'

function toSpeech(lines: SpeakerLine[]): SpeakLine[] {
  const slots = new Map<string, number>()
  let next = 0
  return lines.map((line) => {
    if (!line.speaker) return { text: line.text, slot: 0 }
    if (!slots.has(line.speaker)) slots.set(line.speaker, next++)
    return { text: line.text, slot: slots.get(line.speaker) ?? 0 }
  })
}

export function ListenSession() {
  const { id } = useParams()
  const item = getListening(id ?? '')
  if (!item) return <Missing to="/listen" label="回听解列表" />
  return <ListenPlayer key={item.id} item={item} />
}

function ListenPlayer({ item }: { item: ListeningItem }) {
  usePageTitle(item.title)
  const { state, recordResult } = useStore()
  const furigana = state.settings.furigana
  const hints = state.settings.hints
  const [phase, setPhase] = useState<'question' | 'review'>('question')
  const [qIndex, setQIndex] = useState(0)
  const [choice, setChoice] = useState<string | null>(null)
  const [answers, setAnswers] = useState<(string | null)[]>(() => item.questions.map(() => null))
  const [revealed, setRevealed] = useState(false)
  const [plays, setPlays] = useState(0)
  const saved = useRef(false)
  const explainRef = useRef<HTMLDivElement | null>(null)
  const index = listeningItems.findIndex((entry) => entry.id === item.id)
  const next = listeningItems[index + 1]
  const question = item.questions[qIndex]
  const lines = useMemo(() => toSpeech(item.lines), [item])
  const correct = answers.filter((answer, answerIndex) => answer === item.questions[answerIndex]?.answer).length
  const score = Math.round((correct / item.questions.length) * 100)

  useEffect(() => {
    if (phase !== 'review' || saved.current) return
    saved.current = true
    recordResult('listen', item.id, item.title, score)
  }, [phase, score, item.id, item.title, recordResult])

  useEffect(() => {
    if (revealed) explainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [revealed, qIndex])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (phase !== 'question' || revealed || !question) return
      const target = event.target
      if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) return
      const picked = question.options[Number(event.key) - 1]
      if (picked) setChoice(picked.id)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, revealed, question])

  if (!question && phase === 'question') return null

  return (
    <article className="session">
      <div className="session-nav">
        <Link to="/listen" className="back">听解</Link>
        <span className="num">{index + 1} / {listeningItems.length}</span>
      </div>
      <p className="eyebrow">{domainLabel[item.domain]} · {item.kind === 'dialogue' ? '对话' : '独白'} · {item.minutes}</p>
      <h1>{item.title}</h1>
      <p className="focus">{item.focusZh}</p>
      <section className="paper inset">
        <h2>情境</h2>
        <p>{item.situationZh}</p>
        {item.lines.some((line) => line.speaker) ? (
          <ul className="cast">
            {[...new Map(item.lines.filter((line) => line.speaker).map((line) => [line.speaker, line.roleZh])).entries()].map(([name, role]) => (
              <li key={name}>
                <span className="jp-ui">{name}</span>
                {role ? <span className="muted"> · {role}</span> : null}
              </li>
            ))}
          </ul>
        ) : null}
        <PlayBar lines={lines} label="播放" onPlay={() => setPlays((count) => count + 1)} />
        <p className="fine">已播放 {plays} 次。慢速大约是当前语速的八成。原文在答完后打开。</p>
      </section>

      {phase === 'question' && question ? (
        <section className="paper inset">
          <p className="item-kicker">第 {qIndex + 1} / {item.questions.length} 问 · {questionTypeLabel[question.type]}</p>
          <h2 className="prompt">
            <RubyText value={question.prompt} furigana={furigana} />
          </h2>
          {hints ? <p className="hint">{question.promptZh}</p> : null}
          {plays === 0 ? <p className="fine">还没有播放。可以先听再选。朗读失败时，题目仍然可以作答。</p> : null}
          <div className="options" role="radiogroup" aria-label="选项">
            {question.options.map((option, optionIndex) => {
              const isCorrect = revealed && option.id === question.answer
              const isWrong = revealed && choice === option.id && option.id !== question.answer
              const selected = choice === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  disabled={revealed}
                  className={['option', selected ? 'is-selected' : '', isCorrect ? 'is-correct' : '', isWrong ? 'is-wrong' : ''].filter(Boolean).join(' ')}
                  onClick={() => setChoice(option.id)}
                >
                  <span className="option-index num">{optionIndex + 1}</span>
                  <span>
                    <RubyText value={option.text} furigana={furigana} />
                    {hints ? <small className="option-zh">{option.textZh}</small> : null}
                  </span>
                </button>
              )
            })}
          </div>
          {!revealed ? (
            <button
              type="button"
              className="btn primary"
              disabled={!choice}
              onClick={() => {
                if (!choice) return
                setAnswers((prev) => {
                  const nextAnswers = [...prev]
                  nextAnswers[qIndex] = choice
                  return nextAnswers
                })
                setRevealed(true)
              }}
            >
              确认答案
            </button>
          ) : (
            <div ref={explainRef} className={choice === question.answer ? 'explain is-correct' : 'explain is-wrong'}>
              <strong>{choice === question.answer ? '这一问对上了' : '这一问被带走了'}</strong>
              <p>{question.explanationZh}</p>
              <button
                type="button"
                className="btn primary"
                onClick={() => {
                  if (qIndex + 1 >= item.questions.length) setPhase('review')
                  else {
                    setQIndex((value) => value + 1)
                    setChoice(null)
                    setRevealed(false)
                  }
                }}
              >
                {qIndex + 1 >= item.questions.length ? '看原文和成绩' : '下一问'}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="paper inset review">
          <div className="score-row">
            <ScoreRing score={score} />
            <div>
              <h2>这篇 {correct} / {item.questions.length}</h2>
              <p>{listenBand(score)}</p>
              <p className="fine">成绩已记在这台浏览器。</p>
            </div>
          </div>
          <h2>原文</h2>
          <div className="transcript">
            {item.lines.map((line, lineIndex) => (
              <p key={lineIndex}>
                {line.speaker ? <span className="who jp-ui">{line.speaker}</span> : null}
                <RubyText value={line.text} furigana={furigana} />
              </p>
            ))}
          </div>
          <h2>词</h2>
          <ul className="vocab">
            {item.vocab.map((entry) => (
              <li key={entry.word}>
                <span className="jp">{entry.word}</span>
                <span className="reading">{entry.reading}</span>
                <span>{entry.meaningZh}</span>
              </li>
            ))}
          </ul>
          <div className="end-actions">
            <button
              type="button"
              className="btn"
              onClick={() => {
                saved.current = false
                setPhase('question')
                setQIndex(0)
                setChoice(null)
                setAnswers(item.questions.map(() => null))
                setRevealed(false)
              }}
            >
              再做一次
            </button>
            {next ? (
              <Link to={`/listen/${next.id}`} className="btn primary">下一篇</Link>
            ) : (
              <Link to="/listen" className="btn primary">回列表</Link>
            )}
          </div>
        </section>
      )}
    </article>
  )
}
