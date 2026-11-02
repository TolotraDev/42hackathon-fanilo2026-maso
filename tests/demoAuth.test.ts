import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_PASSWORD } from '@/data/demo/users'
import { AuthFailure } from '@/features/auth/authService'
import { createDemoAuth } from '@/features/auth/demoAuth'

// Stockage de l'appareil simulé (le mode démonstration conserve ses comptes dans localStorage).
const store = new Map<string, string>()
Object.assign(globalThis, {
  window: {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    },
  },
})

const failureCode = (promise: Promise<unknown>) =>
  promise.then(
    () => 'aucune erreur',
    (error: unknown) => (error instanceof AuthFailure ? error.code : 'autre erreur'),
  )

describe('mode démonstration', () => {
  beforeEach(() => store.clear())

  it('connecte un compte de démonstration et donne son rôle', async () => {
    const auth = createDemoAuth()
    await auth.signInWithPassword('redaction@maso.demo', DEMO_PASSWORD)
    expect((await auth.getProfile())?.role).toBe('editor_in_chief')
  })

  it('refuse un mauvais mot de passe', async () => {
    const auth = createDemoAuth()
    expect(await failureCode(auth.signInWithPassword('admin@maso.demo', 'faux'))).toBe('invalid_credentials')
  })

  it('réserve l’administration à l’administrateur', async () => {
    const auth = createDemoAuth()
    await auth.signInWithPassword('journaliste@maso.demo', DEMO_PASSWORD)
    expect(await failureCode(auth.admin.listUsers())).toBe('role_not_allowed')
  })

  it('empêche l’administrateur de modifier son propre compte', async () => {
    const auth = createDemoAuth()
    await auth.signInWithPassword('admin@maso.demo', DEMO_PASSWORD)
    const me = await auth.getProfile()
    expect(await failureCode(auth.admin.setActive(me!.id, false))).toBe('cannot_change_own_account')
  })

  it('un compte suspendu ne peut plus se connecter', async () => {
    const auth = createDemoAuth()
    await auth.signInWithPassword('admin@maso.demo', DEMO_PASSWORD)
    const journalist = (await auth.admin.listUsers()).find((user) => user.role === 'journalist')!
    await auth.admin.setActive(journalist.id, false)
    await auth.signOut()
    expect(await failureCode(auth.signInWithPassword(journalist.email, DEMO_PASSWORD))).toBe('account_suspended')
  })

  it('invite un membre avec le rôle choisi', async () => {
    const auth = createDemoAuth()
    await auth.signInWithPassword('admin@maso.demo', DEMO_PASSWORD)
    await auth.admin.inviteUser({ email: 'Nouveau@Maso.demo', fullName: 'Nouveau membre', role: 'fact_checker', language: 'mg' })
    const invited = (await auth.admin.listUsers()).find((user) => user.email === 'nouveau@maso.demo')
    expect(invited?.role).toBe('fact_checker')
    expect(await failureCode(auth.admin.inviteUser({ email: 'nouveau@maso.demo', fullName: 'Doublon', role: 'admin', language: 'fr' }))).toBe('already_exists')
  })
})
