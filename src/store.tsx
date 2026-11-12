import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { Mode, Persisted, Settings } from './types.ts'
import { StoreContext } from './lib/store-context.ts'
import { emptyState, loadState, recordKey, withResult } from './lib/storage.ts'

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Persisted>(() => loadState())

  useEffect(() => {
    localStorage.setItem('chowa-v1', JSON.stringify(state))
    document.documentElement.dataset.theme = state.settings.theme
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', state.settings.theme === 'dark' ? '#12110f' : '#efe8dc')
  }, [state])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
  }, [])

  const recordResult = useCallback((mode: Mode, id: string, title: string, score: number) => {
    setState((prev) => withResult(prev, mode, id, title, score))
  }, [])

  const resetProgress = useCallback(() => {
    setState((prev) => ({ ...emptyState(), settings: prev.settings }))
  }, [])

  const getRecord = useCallback(
    (mode: Mode, id: string) => state.records[recordKey(mode, id)],
    [state.records],
  )

  const value = useMemo(
    () => ({ state, updateSettings, recordResult, resetProgress, getRecord }),
    [state, updateSettings, recordResult, resetProgress, getRecord],
  )

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}
