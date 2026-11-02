import { describe, expect, it, vi } from 'vitest'
import { toAuthFailure } from '@/features/auth/supabaseErrors'

vi.spyOn(console, 'error').mockImplementation(() => {})

describe('traduction des erreurs Supabase', () => {
  it.each([
    [{ code: 'invalid_credentials', message: 'Invalid login credentials', status: 400 }, 'invalid_credentials'],
    [{ code: 'email_not_confirmed', message: 'Email not confirmed', status: 400 }, 'email_not_confirmed'],
    [{ code: 'PGRST116', message: 'JSON object requested, multiple (or no) rows returned' }, 'profile_missing'],
    [{ code: 'PGRST205', message: "Could not find the table 'public.profiles'" }, 'configuration'],
    [{ code: 'otp_disabled', message: 'Signups not allowed for otp', status: 422 }, 'no_account'],
    [{ code: 'otp_disabled', message: 'OTP is disabled', status: 422 }, 'configuration'],
    [{ message: 'Invalid API key', status: 401 }, 'configuration'],
    [{ name: 'AuthApiError', message: 'Invalid path specified in request URL', status: 404 }, 'configuration'],
    [{ name: 'AuthRetryableFetchError', message: 'Failed to fetch' }, 'network'],
    [{ code: '42501', message: 'cannot_change_own_account' }, 'cannot_change_own_account'],
    [{ code: '42501', message: 'role_not_allowed' }, 'role_not_allowed'],
    [{ message: 'quelque chose d’inattendu' }, 'unknown'],
  ])('%o → %s', (error, expected) => {
    expect(toAuthFailure(error).code).toBe(expected)
  })
})
