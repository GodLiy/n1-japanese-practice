import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { LookupContext } from '../lib/lookup-context.ts'
import type { LookupRequest } from '../lib/lookup-context.ts'
import { SenseList } from './SenseList.tsx'
import { useSpeech } from '../lib/useSpeech.ts'
import { useStore } from '../lib/useStore.ts'

export function LookupProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<LookupRequest | null>(null)
  const [sheet, setSheet] = useState(false)
  const [box, setBox] = useState<{ top: number; left: number; width: number }>({ top: 0, left: 0, width: 320 })
  const panelRef = useRef<HTMLDivElement>(null)
  const { state, toggleSaved, isSaved } = useStore()
  const speech = useSpeech()
  const [speakToken, setSpeakToken] = useState(0)

  const place = useCallback((anchor: HTMLElement) => {
    const narrow = window.innerWidth <= 640
    setSheet(narrow)
    if (narrow) return
    const rect = anchor.getBoundingClientRect()
    const width = Math.min(340, window.innerWidth - 16)
    let left = rect.left
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8
    if (left < 8) left = 8
    const estimated = 280
    const below = window.innerHeight - rect.bottom
    const top = below < estimated && rect.top > estimated ? Math.max(8, rect.top - estimated - 8) : rect.bottom + 8
    setBox({ top, left, width })
  }, [])

  const closeLookup = useCallback((restoreFocus = false) => {
    setCurrent((prev) => {
      if (restoreFocus) prev?.anchor.focus()
      return null
    })
  }, [])

  const openLookup = useCallback((next: LookupRequest) => {
    setCurrent(next)
    place(next.anchor)
  }, [place])

  useEffect(() => {
    if (!current) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        closeLookup(true)
        return
      }
      if (event.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const nodes = [...panel.querySelectorAll<HTMLElement>('button')]
      if (!nodes.length) return
      const first = nodes[0]
      const last = nodes[nodes.length - 1]
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    const onPointer = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (panelRef.current?.contains(target)) return
      if (target instanceof Element && target.closest('.lookup')) return
      closeLookup(false)
    }
    const onReflow = () => {
      if (current.anchor.isConnected) place(current.anchor)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    window.addEventListener('resize', onReflow)
    window.addEventListener('scroll', onReflow, true)
    const timer = window.setTimeout(() => panelRef.current?.querySelector('button')?.focus(), 20)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      window.removeEventListener('resize', onReflow)
      window.removeEventListener('scroll', onReflow, true)
      window.clearTimeout(timer)
    }
  }, [current, closeLookup, place])

  const value = useMemo(() => ({ current, openLookup, closeLookup }), [current, openLookup, closeLookup])
  const saved = current ? isSaved(current.entry.id) : false
  const playing = speech.speaking && speech.activeToken === speakToken && speakToken !== 0

  return (
    <LookupContext.Provider value={value}>
      {children}
      {current
        ? createPortal(
            <div
              ref={panelRef}
              className={sheet ? 'dict-pop is-sheet' : 'dict-pop'}
              role="dialog"
              aria-label={`${current.entry.word}的释义`}
              style={sheet ? undefined : { top: box.top, left: box.left, width: box.width }}
            >
              <div className="dict-pop-head">
                <div>
                  <p className="dict-word jp">{current.entry.word}</p>
                  <p className="dict-reading">
                    {current.entry.reading}
                    <span> · {current.entry.pos}</span>
                  </p>
                </div>
                <button type="button" className="btn" onClick={() => closeLookup(true)}>
                  关闭
                </button>
              </div>
              {current.surface !== current.entry.word ? <p className="fine">文中写的是「{current.surface}」。下面是词典里的词头。</p> : null}
              <SenseList senses={current.entry.senses.length ? current.entry.senses : [{ pos: current.entry.pos, meaningZh: current.entry.meaningZh }]} />
              <p className="jp dict-example" lang="ja">{current.entry.example}</p>
              <p className="fine">{current.entry.exampleZh}</p>
              <div className="dict-pop-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    if (playing) {
                      speech.stop()
                      return
                    }
                    setSpeakToken(speech.speak([{ text: current.entry.word, slot: 0 }], state.settings.rate))
                  }}
                >
                  {playing ? '停止' : '朗读'}
                </button>
                <button type="button" className={saved ? 'btn primary' : 'btn'} aria-pressed={saved} onClick={() => toggleSaved(current.entry.id)}>
                  {saved ? '已在生词本' : '收入生词'}
                </button>
              </div>
            </div>,
            document.body,
          )
        : null}
    </LookupContext.Provider>
  )
}
