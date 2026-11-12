import { createContext } from 'react'
import type { DictEntry } from '../types.ts'

export type LookupRequest = {
  entry: DictEntry
  surface: string
  anchor: HTMLElement
}

export type LookupValue = {
  current: LookupRequest | null
  openLookup: (next: LookupRequest) => void
  closeLookup: (restoreFocus?: boolean) => void
}

export const LookupContext = createContext<LookupValue | null>(null)
