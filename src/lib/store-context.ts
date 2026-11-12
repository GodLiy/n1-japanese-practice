import { createContext } from 'react'
import type { Mode, Persisted, Settings } from '../types.ts'

export type StoreValue = {
  state: Persisted
  updateSettings: (patch: Partial<Settings>) => void
  recordResult: (mode: Mode, id: string, title: string, score: number) => void
  resetProgress: () => void
  getRecord: (mode: Mode, id: string) => Persisted['records'][string] | undefined
  toggleSaved: (id: string) => void
  isSaved: (id: string) => boolean
}

export const StoreContext = createContext<StoreValue | null>(null)
