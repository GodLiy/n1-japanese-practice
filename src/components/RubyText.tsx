import { parseRuby } from '../lib/ruby.ts'

export function RubyText({ value, furigana }: { value: string; furigana: boolean }) {
  const parts = parseRuby(value)
  return (
    <span className={furigana ? 'jp with-ruby' : 'jp'} lang="ja">
      {parts.map((part, index) =>
        part.r && furigana ? (
          <ruby key={`${part.t}-${index}`}>
            {part.t}
            <rt>{part.r}</rt>
          </ruby>
        ) : (
          <span key={`${part.t}-${index}`}>{part.t}</span>
        ),
      )}
    </span>
  )
}
