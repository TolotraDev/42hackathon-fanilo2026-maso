import { describe, expect, it } from 'vitest'
import { AuthFailure } from '@/features/auth/authService'
import { resolveSession } from '@/features/auth/resolveSession'
import type { Profile } from '@/types/domain'

const profile: Profile = {
  id: 'u1',
  email: 'journaliste@maso.demo',
  fullName: 'Démo Journaliste',
  role: 'journalist',
  language: 'fr',
  newsroomId: null,
  active: true,
}

describe('état de session', () => {
  it('connecte l’utilisateur quand le serveur renvoie son profil', () => {
    expect(resolveSession({ profile }, null, false)).toEqual({ status: 'signed_in', profile, offline: false })
  })

  it('hors ligne, reprend le dernier profil connu de l’appareil', () => {
    expect(resolveSession({ error: new AuthFailure('network') }, profile, false)).toEqual({
      status: 'signed_in',
      profile,
      offline: true,
    })
  })

  it('hors ligne sans profil connu, demande de se connecter', () => {
    expect(resolveSession({ error: new AuthFailure('network') }, null, false)).toEqual({ status: 'signed_out' })
  })

  it('une autre erreur ne réutilise pas le cache', () => {
    expect(resolveSession({ error: new Error('jeton invalide') }, profile, false)).toEqual({ status: 'signed_out' })
  })

  it('un compte suspendu est déconnecté avec un message', () => {
    expect(resolveSession({ profile: { ...profile, active: false } }, profile, false)).toEqual({
      status: 'signed_out',
      notice: 'account_suspended',
    })
  })

  it('sans session, conserve le mode invité choisi', () => {
    expect(resolveSession({ profile: null }, null, true)).toEqual({ status: 'guest' })
  })
})
