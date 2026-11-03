import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { readStorage, writeStorage } from '@/lib/storage'
import type { Profile, Role } from '@/types/domain'
import type { AuthErrorCode, AuthService } from './authService'
import { createDemoAuth } from './demoAuth'
import { resolveSession, type ProfileResult } from './resolveSession'
import { createSupabaseAuth } from './supabaseAuth'

export type AuthState =
  | { status: 'loading' }
  /** voluntary : déconnexion demandée par l'utilisateur (on ne le renvoie pas vers sa page précédente). */
  | { status: 'signed_out'; notice?: AuthErrorCode; voluntary?: boolean }
  | { status: 'guest' }
  | { status: 'signed_in'; profile: Profile; offline: boolean }

interface AuthContextValue {
  state: AuthState
  /** Rôle effectif : celui du compte, « public » en mode invité, null sinon. */
  role: Role | null
  profile: Profile | null
  service: AuthService
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  continueAsGuest: () => void
  leaveGuestMode: () => void
  refresh: () => Promise<void>
}

const PROFILE_CACHE_KEY = 'maso.profile'
const GUEST_KEY = 'maso.guest'

function readCachedProfile(): Profile | null {
  try {
    return JSON.parse(readStorage(PROFILE_CACHE_KEY) ?? 'null') as Profile | null
  } catch {
    return null
  }
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Session de l'utilisateur ; reste connecté hors ligne grâce au profil conservé sur l'appareil. */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const service = useMemo(() => (supabase ? createSupabaseAuth(supabase) : createDemoAuth()), [])
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  const refresh = useCallback(async () => {
    let result: ProfileResult
    try {
      result = { profile: await service.getProfile() }
    } catch (error) {
      result = { error }
    }
    const next = resolveSession(result, readCachedProfile(), readStorage(GUEST_KEY) === '1')
    if (next.status === 'signed_in' && !next.offline) {
      writeStorage(PROFILE_CACHE_KEY, JSON.stringify(next.profile))
      writeStorage(GUEST_KEY, '')
    } else if (next.status !== 'signed_in') {
      writeStorage(PROFILE_CACHE_KEY, '')
      if (next.status === 'signed_out' && next.notice === 'account_suspended') await service.signOut()
    }
    setState(next)
  }, [service])

  useEffect(() => {
    void refresh()
    const unsubscribe = service.onSessionChange(() => void refresh())
    const onOnline = () => void refresh()
    window.addEventListener('online', onOnline)
    return () => {
      unsubscribe()
      window.removeEventListener('online', onOnline)
    }
  }, [service, refresh])

  const signIn = useCallback(
    async (email: string, password: string) => {
      await service.signInWithPassword(email, password)
      await refresh()
    },
    [service, refresh],
  )

  const signOut = useCallback(async () => {
    writeStorage(PROFILE_CACHE_KEY, '')
    writeStorage(GUEST_KEY, '')
    await service.signOut()
    setState({ status: 'signed_out', voluntary: true })
  }, [service])

  const continueAsGuest = useCallback(() => {
    writeStorage(GUEST_KEY, '1')
    setState({ status: 'guest' })
  }, [])

  const leaveGuestMode = useCallback(() => {
    writeStorage(GUEST_KEY, '')
    setState({ status: 'signed_out', voluntary: true })
  }, [])

  const value = useMemo<AuthContextValue>(() => {
    const profile = state.status === 'signed_in' ? state.profile : null
    const role: Role | null = profile ? profile.role : state.status === 'guest' ? 'public' : null
    return { state, role, profile, service, signIn, signOut, continueAsGuest, leaveGuestMode, refresh }
  }, [state, service, signIn, signOut, continueAsGuest, leaveGuestMode, refresh])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

/**
 * Pages de l'espace public : tout visiteur, connecté ou non, voit la vue publique
 * (personnes à visibilité publique, sans coordonnées ; aucune action de gestion).
 */
export function PublicVisitor({ children }: { children: React.ReactNode }) {
  const context = useAuth()
  const value = useMemo<AuthContextValue>(() => ({ ...context, role: 'public', profile: null }), [context])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>')
  return context
}
