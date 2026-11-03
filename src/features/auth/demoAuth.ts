// Mode démonstration : utilisé quand Supabase n'est pas configuré (.env vide).
// Comptes fictifs stockés sur l'appareil, mêmes règles que le serveur pour l'administration.
import { DEMO_PASSWORD, DEMO_USERS } from '@/data/demo/users'
import { readStorage, writeStorage } from '@/lib/storage'
import type { Profile } from '@/types/domain'
import { AuthFailure, type AuthService, type SessionEvent } from './authService'

const USERS_KEY = 'maso.demo.users'
const SESSION_KEY = 'maso.demo.session'

interface DemoAccount extends Profile {
  password: string
}

function readUsers(): DemoAccount[] {
  try {
    const stored = JSON.parse(readStorage(USERS_KEY) ?? 'null') as DemoAccount[] | null
    if (Array.isArray(stored) && stored.length > 0) return stored
  } catch {
    // données illisibles : on repart des comptes de démonstration
  }
  return DEMO_USERS.map((user) => ({ ...user, password: DEMO_PASSWORD }))
}

/** Vérification publique d'un badge (W0), en mode démonstration. */
export function demoVerifyBadge(code: string) {
  const user = readUsers().find((item) => item.badge?.code === code.trim().toUpperCase())
  if (!user?.badge) return { found: false as const }
  const today = new Date().toISOString().slice(0, 10)
  const status = user.badge.revoked ? 'revoked' : !user.active ? 'suspended' : user.badge.validUntil < today ? 'expired' : 'valid'
  return { found: true as const, status, full_name: user.fullName, role: user.role, newsroom: null, valid_until: user.badge.validUntil, code: user.badge.code } as const
}

const saveUsers = (users: DemoAccount[]) => writeStorage(USERS_KEY, JSON.stringify(users))
const withoutPassword = ({ password: _password, ...profile }: DemoAccount): Profile => profile

export function createDemoAuth(): AuthService {
  const listeners = new Set<(event: SessionEvent) => void>()
  const emit = (event: SessionEvent) => listeners.forEach((listener) => listener(event))

  const currentUser = (): DemoAccount | null => {
    const id = readStorage(SESSION_KEY)
    return readUsers().find((user) => user.id === id) ?? null
  }

  const requireAdmin = (): DemoAccount => {
    const me = currentUser()
    if (!me || me.role !== 'admin' || !me.active) throw new AuthFailure('role_not_allowed')
    return me
  }

  const updateUser = (userId: string, patch: Partial<DemoAccount>) => {
    const me = requireAdmin()
    if (userId === me.id) throw new AuthFailure('cannot_change_own_account')
    saveUsers(readUsers().map((user) => (user.id === userId ? { ...user, ...patch } : user)))
  }

  return {
    mode: 'demo',

    async getProfile() {
      const user = currentUser()
      return user ? withoutPassword(user) : null
    },

    onSessionChange(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },

    async signInWithPassword(email, password) {
      const user = readUsers().find((candidate) => candidate.email === email.trim().toLowerCase())
      if (!user || user.password !== password) throw new AuthFailure('invalid_credentials')
      if (!user.active) throw new AuthFailure('account_suspended')
      writeStorage(SESSION_KEY, user.id)
      emit('signed_in')
    },

    async sendMagicLink() {
      // Aucun e-mail n'est envoyé en mode démonstration.
    },

    async sendPasswordReset() {
      // Aucun e-mail n'est envoyé en mode démonstration.
    },

    async updatePassword(password) {
      const me = currentUser()
      if (!me) throw new AuthFailure('invalid_credentials')
      saveUsers(readUsers().map((user) => (user.id === me.id ? { ...user, password } : user)))
    },

    async signOut() {
      writeStorage(SESSION_KEY, '')
      emit('signed_out')
    },

    admin: {
      async listUsers() {
        requireAdmin()
        return readUsers()
          .map(withoutPassword)
          .sort((a, b) => a.fullName.localeCompare(b.fullName))
      },

      async inviteUser({ email, fullName, role, language, password }) {
        requireAdmin()
        const users = readUsers()
        const normalized = email.trim().toLowerCase()
        if (users.some((user) => user.email === normalized)) throw new AuthFailure('already_exists')
        users.push({
          id: crypto.randomUUID(),
          email: normalized,
          fullName: fullName.trim(),
          role,
          language,
          newsroomId: null,
          active: true,
          password: password || DEMO_PASSWORD,
        })
        saveUsers(users)
      },

      async setRole(userId, role) {
        updateUser(userId, { role })
      },

      async setActive(userId, active) {
        updateUser(userId, { active })
      },

      async issueBadge(userId, validUntil) {
        requireAdmin()
        const user = readUsers().find((item) => item.id === userId)
        if (!user || user.role === 'admin') throw new AuthFailure('role_not_allowed')
        const code = `MB-${crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`
        saveUsers(readUsers().map((item) => (item.id === userId ? { ...item, badge: { code, validUntil, revoked: false } } : item)))
      },

      async revokeBadge(userId) {
        requireAdmin()
        saveUsers(readUsers().map((item) => (item.id === userId && item.badge ? { ...item, badge: { ...item.badge, revoked: true } } : item)))
      },
    },
  }
}
