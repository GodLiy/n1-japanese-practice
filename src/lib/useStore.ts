import { useContext } from 'react'
import { StoreContext } from './store-context.ts'

export function useStore() {
  const value = useContext(StoreContext)
  if (!value) throw new Error('Store missing')
  return value
}
