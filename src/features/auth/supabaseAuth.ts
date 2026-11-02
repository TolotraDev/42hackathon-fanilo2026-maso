import type { SupabaseClient } from '@supabase/supabase-js'
import type { Profile } from '@/types/domain'
import { AuthFailure, type AuthService } from './authService'
import { toAuthFailure as toFailure } from './supabaseErrors'

interface ProfileRow {
  id: string
  email: string
  full_name: string
  role: Profile['role']
  language: Profile['language']
  newsroom_id: string | null
  active: boolean
}

const toProfile = (row: ProfileRow): Profile => ({
  id: row.id,
  email: row.email,
  fullName: row.full_name,
  role: row.role,
  language: row.language,
  newsroomId: row.newsroom_id,
  active: row.active,
})

export function createSupabaseAuth(client: SupabaseClient): AuthService {
  async function fetchProfile(userId: string): Promise<Profile> {
    const { data, error } = await client.from('profiles').select('*').eq('id', userId).single<ProfileRow>()
    if (error) throw toFailure(error)
    return toProfile(data)
  }

  return {
    mode: 'supabase',

    async getProfile() {
      const { data, error } = await client.auth.getSession()
      if (error) throw toFailure(error)
      if (!data.session) return null
      return fetchProfile(data.session.user.id)
    },

    onSessionChange(listener) {
      const { data } = client.auth.onAuthStateChange((event) => {
        // Ne pas appeler Supabase dans ce rappel : on prévient seulement l'application.
        if (event === 'SIGNED_IN') setTimeout(() => listener('signed_in'))
        if (event === 'SIGNED_OUT') setTimeout(() => listener('signed_out'))
        if (event === 'PASSWORD_RECOVERY') setTimeout(() => listener('password_recovery'))
      })
      return () => data.subscription.unsubscribe()
    },

    async signInWithPassword(email, password) {
      const { data, error } = await client.auth.signInWithPassword({ email, password })
      if (error) throw toFailure(error)
      let profile: Profile
      try {
        profile = await fetchProfile(data.user.id)
      } catch (failure) {
        // Mot de passe correct mais profil illisible : on ne laisse pas une session à moitié ouverte.
        await client.auth.signOut()
        throw failure
      }
      if (!profile.active) {
        await client.auth.signOut()
        throw new AuthFailure('account_suspended')
      }
    },

    async sendMagicLink(email, redirectTo) {
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: false, emailRedirectTo: redirectTo },
      })
      if (error) throw toFailure(error)
    },

    async sendPasswordReset(email, redirectTo) {
      const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo })
      if (error) throw toFailure(error)
    },

    async updatePassword(password) {
      const { error } = await client.auth.updateUser({ password })
      if (error) throw toFailure(error)
    },

    async signOut() {
      await client.auth.signOut()
    },

    admin: {
      async listUsers() {
        const { data, error } = await client.from('profiles').select('*').order('full_name').returns<ProfileRow[]>()
        if (error) throw toFailure(error)
        return data.map(toProfile)
      },

      async inviteUser({ email, fullName, role, language }) {
        const { error } = await client.functions.invoke('invite-user', {
          body: {
            email,
            full_name: fullName,
            role,
            language,
            redirect_to: `${window.location.origin}/nouveau-mot-de-passe`,
          },
        })
        if (error) throw toFailure(error)
      },

      async setRole(userId, role) {
        const { error } = await client.rpc('admin_set_role', { p_user_id: userId, p_role: role })
        if (error) throw toFailure(error)
      },

      async setActive(userId, active) {
        const { error } = await client.rpc('admin_set_active', { p_user_id: userId, p_active: active })
        if (error) throw toFailure(error)
      },
    },
  }
}
