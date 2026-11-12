import { useMemo, useState } from 'react'
import { dictionary } from '../content/dictionary.ts'
import { dictTopicLabel, dictTopicOrder } from '../lib/labels.ts'
import { kataToHira } from '../lib/score.ts'
import { usePageTitle } from '../lib/usePageTitle.ts'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'
import type { DictTopic } from '../types.ts'

const poses = ['名词', '动词', '形容动词', '副词', '连语']

function fold(value: string): string {
  return kataToHira(value.normalize('NFKC').trim().toLowerCase())
}

export function WordBook() {
  usePageTitle('单词本')
  const { state, toggleSaved, isSaved } = useStore()
  const speech = useSpeech()
  const [query, setQuery] = useState('')
  const [topic, setTopic] = useState<DictTopic | 'all'>('all')
  const [pos, setPos] = useState<string | 'all'>('all')
  const [onlySaved, setOnlySaved] = useState(false)
  const [token, setToken] = useState(0)
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const needle = query.trim()
  const folded = fold(needle)
  const saved = useMemo(() => new Set(state.savedWords), [state.savedWords])
  const matches = useMemo(() => {
    const pool = onlySaved ? dictionary.filter((entry) => saved.has(entry.id)) : dictionary
    return pool.filter((entry) => {
      if (topic !== 'all' && entry.topic !== topic) return false
      if (pos !== 'all' && !entry.pos.startsWith(pos)) return false
      if (!needle) return true
      return (
        fold(entry.word).includes(folded) ||
        fold(entry.reading).includes(folded) ||
        entry.meaningZh.toLowerCase().includes(needle.toLowerCase()) ||
        (entry.forms ?? []).some((form) => fold(form).includes(folded))
      )
    })
  }, [needle, folded, topic, pos, onlySaved, saved])
  const ordered = onlySaved
    ? [...matches].sort((a, b) => state.savedWords.indexOf(a.id) - state.savedWords.indexOf(b.id))
    : matches

  return (
    <section>
      <p className="eyebrow">词</p>
      <h1>单词本</h1>
      <p className="lede">
        收录 {dictionary.length} 条 N1 及以后的词。释义和例句是为这套练习写的，不是某本单词书的原文。可以按汉字、假名或中文搜索，也可以按主题和词性浏览。点「收入生词」后的词记在这台浏览器。
      </p>
      <label className="search">
        <span>搜索</span>
        <input
          type="search"
          value={query}
          placeholder="汉字、假名或中文"
          aria-label="搜索单词"
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="chips" aria-label="按范围筛选">
        <button type="button" className={!onlySaved ? 'chip is-on' : 'chip'} onClick={() => setOnlySaved(false)}>
          全部 {dictionary.length}
        </button>
        <button type="button" className={onlySaved ? 'chip is-on' : 'chip'} onClick={() => setOnlySaved(true)}>
          我的生词 {state.savedWords.length}
        </button>
      </div>
      <div className="chips" aria-label="按主题浏览">
        <button type="button" className={topic === 'all' ? 'chip is-on' : 'chip'} onClick={() => setTopic('all')}>全部主题</button>
        {dictTopicOrder.map((item) => (
          <button key={item} type="button" className={topic === item ? 'chip is-on' : 'chip'} onClick={() => setTopic(item)}>
            {dictTopicLabel[item]}
          </button>
        ))}
      </div>
      <div className="chips" aria-label="按词性浏览">
        <button type="button" className={pos === 'all' ? 'chip is-on' : 'chip'} onClick={() => setPos('all')}>全部词性</button>
        {poses.map((item) => (
          <button key={item} type="button" className={pos === item ? 'chip is-on' : 'chip'} onClick={() => setPos(item)}>
            {item}
          </button>
        ))}
      </div>
      <p className="fine">当前 {ordered.length} 条。朗读用浏览器的日语语音。</p>
      {ordered.length === 0 ? (
        <p className="muted">{onlySaved && !needle ? '还没有收入生词。读文章或看原文时，点开一个词就能收下。' : '词典里没有这个词。'}</p>
      ) : (
        <ul className="word-list">
          {ordered.map((entry) => {
            const mine = speech.speaking && speech.activeToken === token && speakingId === entry.id
            const kept = isSaved(entry.id)
            return (
              <li key={entry.id} className="paper word-card">
                <div className="word-card-head">
                  <div>
                    <p className="dict-word jp">{entry.word}</p>
                    <p className="dict-reading">{entry.reading} · {entry.pos} · {dictTopicLabel[entry.topic]}</p>
                  </div>
                </div>
                <p className="dict-meaning">{entry.meaningZh}</p>
                <p className="jp dict-example" lang="ja">{entry.example}</p>
                <p className="fine">{entry.exampleZh}</p>
                <div className="dict-pop-actions">
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      if (mine) {
                        speech.stop()
                        return
                      }
                      setSpeakingId(entry.id)
                      setToken(speech.speak([{ text: entry.word, slot: 0 }], state.settings.rate))
                    }}
                  >
                    {mine ? '停止' : '朗读'}
                  </button>
                  <button type="button" className={kept ? 'btn primary' : 'btn'} aria-pressed={kept} onClick={() => toggleSaved(entry.id)}>
                    {kept ? '移出生词' : '收入生词'}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
