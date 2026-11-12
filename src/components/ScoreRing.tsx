export function ScoreRing({ score }: { score: number }) {
  const radius = 28
  const circ = 2 * Math.PI * radius
  const clamped = Math.max(0, Math.min(100, score))
  const offset = circ * (1 - clamped / 100)
  return (
    <div className="ring-wrap">
      <svg viewBox="0 0 72 72" className="ring" aria-hidden="true">
        <circle className="ring-track" cx="36" cy="36" r={radius} />
        <circle className="ring-value" cx="36" cy="36" r={radius} strokeDasharray={circ} strokeDashoffset={offset} />
      </svg>
      <strong className="num">{clamped}</strong>
    </div>
  )
}
