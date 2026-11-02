import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Adresse du projet seule (https://xxxx.supabase.co) : un chemin collé par erreur,
 * comme « /rest/v1/ » copié depuis le tableau de bord, ferait échouer toutes les requêtes.
 */
export function projectOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    return new URL(value.trim()).origin
  } catch {
    return undefined
  }
}

const url = projectOrigin(import.meta.env.VITE_SUPABASE_URL)
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Client Supabase, ou null si les variables d'environnement ne sont pas renseignées :
 * l'application bascule alors en mode démonstration local (voir features/auth/demoAuth.ts).
 * La session est conservée sur l'appareil pour rester connecté hors ligne.
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'maso.auth' },
      })
    : null
