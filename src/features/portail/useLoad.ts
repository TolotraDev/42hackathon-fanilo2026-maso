import { useEffect, useState } from 'react'

/** Chargement asynchrone d'une page : données, erreur, et rechargement quand les dépendances changent. */
export function useLoad<T>(load: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | undefined; error: unknown; loading: boolean }>({ data: undefined, error: null, loading: true })
  useEffect(() => {
    let cancelled = false
    setState((current) => ({ ...current, loading: true, error: null }))
    load()
      .then((data) => !cancelled && setState({ data, error: null, loading: false }))
      .catch((error: unknown) => !cancelled && setState({ data: undefined, error, loading: false }))
    return () => {
      cancelled = true
    }
  }, deps)
  return state
}
