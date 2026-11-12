import type { DictSense } from '../types.ts'

export function SenseList({ senses }: { senses: DictSense[] }) {
  if (senses.length === 0) return null
  if (senses.length === 1) {
    const only = senses[0]
    return (
      <p className="dict-meaning">
        <span className="dict-sense-pos">{only.pos}</span>
        {only.meaningZh}
      </p>
    )
  }
  return (
    <ol className="dict-senses">
      {senses.map((sense, index) => (
        <li key={`${sense.pos}-${index}`}>
          <span className="dict-sense-pos">{sense.pos}</span>
          <span>{sense.meaningZh}</span>
        </li>
      ))}
    </ol>
  )
}
