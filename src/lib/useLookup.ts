import { useContext } from 'react'
import { LookupContext } from './lookup-context.ts'

export function useLookup() {
  const value = useContext(LookupContext)
  if (!value) throw new Error('Lookup missing')
  return value
}
