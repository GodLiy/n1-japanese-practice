import { useRef } from 'react'
import type { DictEntry } from '../types.ts'
import { parseRuby } from '../lib/ruby.ts'
import type { Segment } from '../lib/ruby.ts'
import { tokenize } from '../lib/segment.ts'
import { useLookup } from '../lib/useLookup.ts'

function LookupButton({
  entry,
  surface,
  reading,
}: {
  entry: DictEntry
  surface: string
  reading?: string
}) {
  const { current, openLookup } = useLookup()
  const ref = useRef<HTMLButtonElement>(null)
  const open = current?.anchor === ref.current && current.entry.id === entry.id
  return (
    <button
      ref={ref}
      type="button"
      className="lookup"
      lang="ja"
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={() => {
        const anchor = ref.current
        if (!anchor) return
        if (open) return
        openLookup({ entry, surface, anchor })
      }}
    >
      {reading ? (
        <ruby>
          {surface}
          <rt>{reading}</rt>
        </ruby>
      ) : (
        surface
      )}
    </button>
  )
}

function renderSegment(part: Segment, furigana: boolean, key: string) {
  const tokens = tokenize(part.t)
  const whole = tokens.length === 1 && tokens[0]?.entry && tokens[0].text === part.t
  if (whole && tokens[0]?.entry) {
    return (
      <LookupButton
        key={key}
        entry={tokens[0].entry}
        surface={part.t}
        reading={furigana ? part.r : undefined}
      />
    )
  }
  return tokens.map((token, index) =>
    token.entry ? (
      <LookupButton
        key={`${key}-${index}`}
        entry={token.entry}
        surface={token.text}
        reading={furigana && tokens.length === 1 ? part.r : undefined}
      />
    ) : (
      <span key={`${key}-${index}`}>{token.text}</span>
    ),
  )
}

export function LookupText({ value, furigana }: { value: string; furigana: boolean }) {
  const parts = parseRuby(value)
  return (
    <span className={furigana ? 'jp with-ruby' : 'jp'} lang="ja">
      {parts.map((part, index) => renderSegment(part, furigana, `${part.t}-${index}`))}
    </span>
  )
}
