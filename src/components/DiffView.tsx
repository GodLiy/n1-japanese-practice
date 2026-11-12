import { alignJa } from '../lib/score.ts'

export function DiffView({ target, heard }: { target: string; heard: string }) {
  if (!heard.trim()) return null
  const aligned = alignJa(target, heard)
  return (
    <div className="diff">
      <p className="diff-label">对照。标点已去掉，片假名按平假名比较。红色是没对上的字。</p>
      <p className="diff-caption">目标</p>
      <p className="jp diff-line" lang="ja">
        {aligned.target.map((piece, index) => (
          <span key={`t-${index}`} className={piece.kind === 'ok' ? 'diff-ok' : 'diff-bad'}>
            {piece.text}
          </span>
        ))}
      </p>
      <p className="diff-caption">识别</p>
      <p className="jp diff-line" lang="ja">
        {aligned.heard.map((piece, index) => (
          <span key={`h-${index}`} className={piece.kind === 'ok' ? 'diff-ok' : 'diff-extra'}>
            {piece.text}
          </span>
        ))}
      </p>
    </div>
  )
}
