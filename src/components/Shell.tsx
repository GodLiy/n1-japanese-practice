import { NavLink, Outlet } from 'react-router'
import { HostGuide } from './HostGuide.tsx'
import { Scene } from './Scene.tsx'
import { Component } from 'react'
import type { ReactNode } from 'react'

class PageBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null }

  static getDerivedStateFromError(error: Error): { error: Error | null } {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="paper narrow">
          <h1>这一页没有打开</h1>
          <p className="muted">刷新一次。已经记下的练习还在这台浏览器里。</p>
          <button type="button" className="btn primary" onClick={() => window.location.reload()}>
            刷新
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

const links = [
  { to: '/', label: '今日', end: true },
  { to: '/listen', label: '听', end: false },
  { to: '/reading', label: '读', end: false },
  { to: '/speak', label: '说', end: false },
  { to: '/words', label: '词', end: false },
  { to: '/progress', label: '记录', end: false },
]

export function Shell() {
  return (
    <>
      <Scene />
      <HostGuide />
      <a className="skip" href="#content">
        跳到练习
      </a>
      <header className="topbar">
        <div className="wrap topbar-inner">
          <NavLink to="/" className="brand" end>
            <span className="brand-mark" aria-hidden="true" />
            <span className="brand-text">
              <span className="brand-name">聴話</span>
              <span className="brand-sub">听读说</span>
            </span>
          </NavLink>
          <nav className="desktop-nav" aria-label="主导航">
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'nav-link is-active' : 'nav-link')}>
                {link.label}
              </NavLink>
            ))}
          </nav>
          <NavLink to="/settings" className={({ isActive }) => (isActive ? 'text-btn is-active' : 'text-btn')}>
            设置
          </NavLink>
        </div>
      </header>
      <main id="content" className="wrap page">
        <PageBoundary>
          <Outlet />
        </PageBoundary>
      </main>
      <footer className="site-footer">
        <div className="wrap footer-inner">
          <p>稿子是为练习写的，不是考试真题，也不是媒体或课程的原文。进度只留在这台浏览器。</p>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="移动导航">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.end} className={({ isActive }) => (isActive ? 'bottom-link is-active' : 'bottom-link')}>
            {link.label}
          </NavLink>
        ))}
      </nav>
    </>
  )
}
