import { Suspense } from 'react'
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

/** Espace connecté : compte ou mode invité. Sinon, espace public à la racine, présentation puis connexion ailleurs. */
export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { state } = useAuth()
  const location = useLocation()
  if (state.status === 'loading') return <SplashScreen />
  if (state.status === 'signed_out') {
    // MASO est d'abord une plateforme publique : la racine ouvre l'espace public, pas la connexion.
    // Déconnexion volontaire : retour à l'espace public, comme à l'arrivée sur la racine.
    if (location.pathname === '/' || state.voluntary) return <Navigate to="/portail" replace />
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

/** Page chargée à la demande, avec un indicateur discret pendant le téléchargement. */
export function Lazy({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<div className="flex min-h-40 items-center justify-center" role="status" aria-label="…"><span className="size-6 animate-spin rounded-full border-2 border-cobalt border-t-transparent" /></div>}>
      {children}
    </Suspense>
  )
}
