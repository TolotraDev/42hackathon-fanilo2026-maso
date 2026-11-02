import { AuthFailure, type AuthErrorCode } from './authService'

interface SupabaseLikeError {
  name?: string
  message?: string
  code?: string
  status?: number
}

/** Codes renvoyés par Supabase Auth (error.code) et PostgREST (code PGRST…) → codes MASO traduisibles. */
const CODES: Record<string, AuthErrorCode> = {
  invalid_credentials: 'invalid_credentials',
  email_not_confirmed: 'email_not_confirmed',
  user_banned: 'account_suspended',
  over_request_rate_limit: 'rate_limited',
  over_email_send_rate_limit: 'rate_limited',
  email_exists: 'already_exists',
  user_already_exists: 'already_exists',
  email_address_not_authorized: 'email_not_authorized',
  otp_disabled: 'configuration',
  email_provider_disabled: 'configuration',
  PGRST116: 'profile_missing', // aucune ligne dans public.profiles pour ce compte
  PGRST301: 'configuration', // jeton refusé par l'API
  PGRST205: 'configuration', // table introuvable : migrations non appliquées
  '42501': 'role_not_allowed',
}

export function toAuthFailure(error: SupabaseLikeError): AuthFailure {
  // La cause exacte reste visible dans la console du navigateur (F12) pour le diagnostic.
  console.error('[MASO] Erreur Supabase :', error)
  const message = error.message ?? ''
  // Erreurs levées par nos fonctions SQL : le message porte le code exact (plusieurs partagent le code 42501).
  if (message.includes('cannot_change_own_account')) return new AuthFailure('cannot_change_own_account')
  if (message.includes('role_not_allowed')) return new AuthFailure('role_not_allowed')
  // Lien magique demandé pour une adresse sans compte (la création de compte par e-mail est désactivée).
  if (/signups not allowed/i.test(message)) return new AuthFailure('no_account')
  if (error.code && CODES[error.code]) return new AuthFailure(CODES[error.code])
  if (error.name === 'AuthRetryableFetchError' || /failed to fetch|network/i.test(message)) return new AuthFailure('network')
  if (error.status === 429) return new AuthFailure('rate_limited')
  if (/invalid api key|no api key|invalid path specified/i.test(message)) return new AuthFailure('configuration')
  if (/invalid login credentials/i.test(message)) return new AuthFailure('invalid_credentials')
  if (/email not confirmed/i.test(message)) return new AuthFailure('email_not_confirmed')
  if (/already (been )?registered|already exists/i.test(message)) return new AuthFailure('already_exists')
  return new AuthFailure('unknown')
}
