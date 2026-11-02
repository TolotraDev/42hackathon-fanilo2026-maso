import type { Profile } from '@/types/domain'
import { AuthFailure } from './authService'
import type { AuthState } from './AuthProvider'

export type ProfileResult = { profile: Profile | null } | { error: unknown }

/**
 * Décide de l'état de session à partir du profil lu sur le serveur.
 * Hors ligne, le dernier profil connu de l'appareil est repris : l'utilisateur reste connecté (M1).
 */
export function resolveSession(result: ProfileResult, cached: Profile | null, guest: boolean): AuthState {
  const signedOut: AuthState = guest ? { status: 'guest' } : { status: 'signed_out' }
  if ('error' in result) {
    const offline = result.error instanceof AuthFailure && result.error.code === 'network'
    return offline && cached ? { status: 'signed_in', profile: cached, offline: true } : signedOut
  }
  if (!result.profile) return signedOut
  if (!result.profile.active) return { status: 'signed_out', notice: 'account_suspended' }
  return { status: 'signed_in', profile: result.profile, offline: false }
}
