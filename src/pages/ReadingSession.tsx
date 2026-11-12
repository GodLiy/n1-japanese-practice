import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router'
import { LookupText } from '../components/LookupText.tsx'
import { Missing } from '../components/Missing.tsx'
import { PlayBar } from '../components/PlayBar.tsx'
import { RubyText } from '../components/RubyText.tsx'
import { ScoreRing } from '../components/ScoreRing.tsx'
import { articles, getArticle } from '../content/articles.ts'
import { domainLabel, levelLabel, questionListenFor, questionTypeLabel } from '../lib/labels.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'
import type { Article } from '../types.ts'

function readingBand(score: number): string {
  if (score >= 100) return '这篇的问题都站住了。下一篇可以专门看作者最后把责任放在谁身上。'
  if (score >= 60) return '大意有了。错的那一问，回到那一段，看被否定的说法。'
  if (score >= 30) return '抓住了几处词。先看中文解释，再把下划线的词点开。'
  return '先别急着重做。把每一段的最后一句再读一遍，问自己作者反对的是什么。'
}

export function ReadingSession() {
  const { id } = useParams()
  const item = getArticle(id ?? '')
  if (!item) return <Missing to="/reading" label="回阅读列表" />
  return <Reader key={item.id} item={item} />
}

function ParagraphPlay({ text, index }: { text: string; index: number }) {
  const speech = useSpeech()
  const { state } = useStore()
  const [token, setToken] = useState(0)
  const mine = speech.speaking && speech.activeToken === token && token !== 0
  return (
    <button
      type="button"
      className="btn para-play"
      aria-label={`朗读第 ${index + 1} 段`}
      onClick={() => {
        if (mine) speech.stop()
        else setToken(speech.speak([{ text, slot: 0 }], state.settings.rate))
      }}
    >
      {mine ? '停止本段' : '朗读本段'}
    </button>
  )
}

function Reader({ item }: { item: Article }) {
  usePageTitle(item.title)
  const { state, recordResult } = useStore()
  const furigana = state.settings.furigana
  const hints = state.settings.hints
  const [phase, setPhase] = useState<'question' | 'review'>('question')
  const [qIndex, setQIndex] = useState(0)
  const [choice, setChoice] = useState<string | null>(null)
  const [answers, setAnswers] = useState<(string | null)[]>(() => item.questions.map(() => null))
  const [revealed, setRevealed] = useState(false)
  const saved = useRef(false)
  const explainRef = useRef<HTMLDivElement | null>(null)
  const index = articles.findIndex((entry) => entry.id === item.id)
  const next = articles[index + 1]
  const question = item.questions[qIndex]
  const correct = answers.filter((answer, answerIndex) => answer === item.questions[answerIndex]?.answer).length
  const score = Math.round((correct / item.questions.length) * 100)

  useEffect(() => {
    if (phase !== 'review' || saved.current) return
    saved.current = true
    recordResult('article', item.id, item.title, score)
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
        <Link to="/reading" className="back">阅读</Link>
        <span className="num">{index + 1} / {articles.length}</span>
      </div>
      <p className="eyebrow">{domainLabel[item.topic]} · {levelLabel[item.level]} · {item.minutes}</p>
      <h1>{item.title}</h1>
      {item.titleJa ? <p className="title-ja jp-ui">{item.titleJa}</p> : null}
      {item.newsDate || item.sourceZh ? <p className="fine">{[item.newsDate, item.sourceZh].filter(Boolean).join(' · ')}</p> : null}
      <p className="focus">{item.leadZh}</p>
      <section className="paper inset">
        <h2>正文</h2>
        <p className="fine">下划线的词可以点。词典里没有的字不会变成按钮。全文和每一段都可以朗读。</p>
        <PlayBar lines={item.paragraphs.map((text) => ({ text, slot: 0 }))} label="朗读全文" />
        <div className="reading-body">
          {item.paragraphs.map((paragraph, paragraphIndex) => (
            <div key={paragraphIndex} className="reading-p">
              <p>
                <LookupText value={paragraph} furigana={furigana} />
              </p>
              <ParagraphPlay text={paragraph} index={paragraphIndex} />
            </div>
          ))}
        </div>
      </section>

      {phase === 'question' && question ? (
        <section className="paper inset" id="questions">
          <p className="item-kicker">读完再答 · 第 {qIndex + 1} / {item.questions.length} 问 · {questionTypeLabel[question.type]}</p>
          <p className="purpose">{questionListenFor[question.type]}</p>
          <h2 className="prompt">
            <LookupText value={question.prompt} furigana={furigana} />
          </h2>
          {hints ? <p className="hint">{question.promptZh}</p> : null}
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
                {qIndex + 1 >= item.questions.length ? '看成绩' : '下一问'}
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
              <p>{readingBand(score)}</p>
              <p className="fine">成绩已记在这台浏览器。</p>
            </div>
          </div>
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
            {next ? <Link to={`/reading/${next.id}`} className="btn primary">下一篇</Link> : <Link to="/reading" className="btn primary">回列表</Link>}
          </div>
        </section>
      )}
    </article>
  )
}
