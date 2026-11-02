import { Navigate, useLocation } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { canAccessSection, homePathFor, type SectionId } from '@/lib/permissions'
import { useAuth } from './AuthProvider'
import { isOnboarded } from './onboarding'

export function SplashScreen() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-navy" role="status" aria-live="polite">
      <Logo />
    </div>
  )
}

/** Espace connecté : compte ou mode invité. Sinon, présentation puis connexion. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <SplashScreen />
  if (state.status === 'signed_out') {
    const target = isOnboarded() ? '/connexion' : '/bienvenue'
    return <Navigate to={target} replace state={state.voluntary ? undefined : { from: location.pathname }} />
  }
  return children
}

/** Espace réservé à certains rôles (section 3) ; sinon retour à l'accueil du rôle. */
export function RequireSection({ section, children }: { section: SectionId; children: React.ReactNode }) {
  const { role } = useAuth()
  if (!canAccessSection(role, section)) return <Navigate to={homePathFor(role)} replace />
  return children
}

export function HomeRedirect() {
  const { role } = useAuth()
  return <Navigate to={homePathFor(role)} replace />
}

/** Pages de connexion : un utilisateur déjà connecté est renvoyé vers son accueil. */
export function PublicOnly({ children }: { children: React.ReactNode }) {
  const { state, role } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <SplashScreen />
  if (state.status === 'signed_in') {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/' ? from : homePathFor(role)} replace />
  }
  return children
}
