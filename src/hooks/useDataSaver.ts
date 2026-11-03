import { useCallback, useSyncExternalStore } from 'react'
import { readStorage, writeStorage } from '@/lib/storage'

// Mode économie de données (M14) : pas d'appel réseau automatique non indispensable
// (veille RSS, contrôle du service d'analyse) ; l'utilisateur les lance lui-même.
const KEY = 'maso.dataSaver'
const listeners = new Set<() => void>()

export const isDataSaverOn = () => readStorage(KEY) === '1'

export function useDataSaver(): [boolean, (on: boolean) => void] {
  const on = useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    isDataSaverOn,
  )
  const set = useCallback((next: boolean) => {
    writeStorage(KEY, next ? '1' : '')
    listeners.forEach((listener) => listener())
  }, [])
  return [on, set]
}
