import { Link } from 'react-router'

export function Missing({ to, label }: { to: string; label: string }) {
  return (
    <section className="paper narrow">
      <h1>没有这篇</h1>
      <p className="muted">链接和现有练习对不上。</p>
      <Link to={to} className="btn primary">
        {label}
      </Link>
    </section>
  )
}
