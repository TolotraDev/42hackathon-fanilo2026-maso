import type { Language, Profile, UserRole } from '@/types/domain'

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'account_suspended'
  | 'network'
  | 'rate_limited'
  | 'role_not_allowed'
  | 'cannot_change_own_account'
  | 'already_exists'
  | 'email_not_confirmed'
  | 'email_not_authorized'
  | 'profile_missing'
  | 'no_account'
  | 'configuration'
  | 'function_missing'
  | 'weak_password'
  | 'unknown'

/** Erreur d'authentification avec un code traduisible (clé i18n auth.error.<code>). */
export class AuthFailure extends Error {
  constructor(public readonly code: AuthErrorCode) {
    super(code)
  }
}

export type SessionEvent = 'signed_in' | 'signed_out' | 'password_recovery'

export interface InviteInput {
  email: string
  fullName: string
  role: UserRole
  language: Language
  /** Mot de passe provisoire : le compte est créé tout de suite, sans e-mail d'invitation. */
  password?: string
}

export interface AuthService {
  /** « supabase » : comptes réels ; « demo » : comptes fictifs stockés sur l'appareil. */
  readonly mode: 'supabase' | 'demo'
  /** Profil de la session en cours, null si personne n'est connecté. Lève AuthFailure('network') hors ligne. */
  getProfile(): Promise<Profile | null>
  onSessionChange(listener: (event: SessionEvent) => void): () => void
  signInWithPassword(email: string, password: string): Promise<void>
  sendMagicLink(email: string, redirectTo: string): Promise<void>
  sendPasswordReset(email: string, redirectTo: string): Promise<void>
  updatePassword(password: string): Promise<void>
  signOut(): Promise<void>
  admin: AdminService
}

/** Gestion des comptes (écran W12) — réservée à l'administrateur, contrôlée côté serveur. */
export interface AdminService {
  listUsers(): Promise<Profile[]>
  inviteUser(input: InviteInput): Promise<void>
  setRole(userId: string, role: UserRole): Promise<void>
  setActive(userId: string, active: boolean): Promise<void>
  issueBadge(userId: string, validUntil: string): Promise<void>
  revokeBadge(userId: string): Promise<void>
}
