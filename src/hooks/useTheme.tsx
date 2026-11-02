import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { readStorage, writeStorage } from '@/lib/storage'

export type ThemePreference = 'light' | 'dark' | 'system'

interface ThemeContextValue {
  preference: ThemePreference
  isDark: boolean
  setPreference: (next: ThemePreference) => void
}

const THEME_STORAGE_KEY = 'maso.theme'
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)')

function readPreference(): ThemePreference {
  const stored = readStorage(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'system'
}

function resolveDark(preference: ThemePreference): boolean {
  return preference === 'dark' || (preference === 'system' && darkQuery().matches)
}

/** Applique le thème mémorisé au démarrage, avant le premier rendu. */
export function initTheme() {
  document.documentElement.classList.toggle('dark', resolveDark(readPreference()))
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/** Préférence de thème (clair, sombre ou système), mémorisée sur l'appareil. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readPreference)
  const [systemDark, setSystemDark] = useState(() => darkQuery().matches)

  useEffect(() => {
    const query = darkQuery()
    const onChange = () => setSystemDark(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  const isDark = preference === 'dark' || (preference === 'system' && systemDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark)
  }, [isDark])

  const setPreference = useCallback((next: ThemePreference) => {
    writeStorage(THEME_STORAGE_KEY, next)
    setPreferenceState(next)
  }, [])

  const value = useMemo(() => ({ preference, isDark, setPreference }), [preference, isDark, setPreference])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return context
}
