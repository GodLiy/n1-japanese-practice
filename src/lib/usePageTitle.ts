import { useEffect } from 'react'

export function usePageTitle(title: string): void {
  useEffect(() => {
    document.title = title === '聴話' ? '聴話 — 听与说' : `${title} — 聴話`
  }, [title])
}
