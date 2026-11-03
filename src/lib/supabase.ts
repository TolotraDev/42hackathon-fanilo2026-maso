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

/** Délais avant chaque nouvelle tentative d'une lecture coupée par le réseau. */
export const RETRY_DELAYS_MS = [400, 1200]

/**
 * Réseau instable (connexion coupée, ERR_CONNECTION_CLOSED) : une lecture (GET / HEAD) est retentée
 * deux fois avant d'échouer. Les écritures ne sont jamais rejouées ici : la file de synchronisation
 * des dossiers s'en charge, sans doublon.
 */
export function fetchWithRetry(baseFetch: typeof fetch = fetch, delays: number[] = RETRY_DELAYS_MS): typeof fetch {
  return async (input, init) => {
    const method = (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()
    const retryable = method === 'GET' || method === 'HEAD'
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await baseFetch(input, init)
      } catch (error) {
        const aborted = error instanceof DOMException && error.name === 'AbortError'
        const offline = typeof navigator !== 'undefined' && navigator.onLine === false
        if (!retryable || aborted || offline || attempt >= delays.length) throw error
        await new Promise((resolve) => setTimeout(resolve, delays[attempt]))
      }
    }
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
        global: { fetch: fetchWithRetry() },
      })
    : null
