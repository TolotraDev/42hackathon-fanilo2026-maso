// Diagnostic affiché dans la console du navigateur (F12 → Console) au démarrage :
// version déployée, mode (démonstration ou Supabase), services joignables. Aucune clé n'est affichée.
import { analyseApi } from './analyseApi'
import { projectOrigin, supabase } from './supabase'

const presence = (value: string | undefined) => (value?.trim() ? 'présente' : 'ABSENTE')

export function logStartupDiagnostics(): void {
  const env = import.meta.env
  console.info(`[MASO] Version ${__APP_VERSION__} · commit ${__BUILD_COMMIT__} · construite le ${__BUILD_TIME__}`)

  if (!supabase) {
    console.error(
      '[MASO] Mode démonstration : le site a été construit SANS Supabase. Seuls les comptes de démonstration fonctionnent.\n' +
        'Correction : renseigner les variables dans l’hébergeur (Vercel → Settings → Environment Variables, case « Production » cochée), puis redéployer.',
      { VITE_SUPABASE_URL: presence(env.VITE_SUPABASE_URL), VITE_SUPABASE_ANON_KEY: presence(env.VITE_SUPABASE_ANON_KEY) },
    )
  } else {
    const origin = projectOrigin(env.VITE_SUPABASE_URL)
    console.info('[MASO] Supabase :', origin)
    void fetch(`${origin}/auth/v1/health`, { headers: { apikey: env.VITE_SUPABASE_ANON_KEY ?? '' } })
      .then((response) =>
        response.ok
          ? console.info('[MASO] Supabase joignable.')
          : console.error(`[MASO] Supabase répond ${response.status} : vérifier VITE_SUPABASE_ANON_KEY (clé « anon public »).`),
      )
      .catch((error: unknown) => console.error('[MASO] Supabase injoignable :', error))
  }

  if (!env.VITE_ANALYSE_API_URL?.trim()) {
    console.error('[MASO] VITE_ANALYSE_API_URL absente : les analyses serveur (lien, IA, vérifications publiées) sont désactivées.')
  } else {
    console.info('[MASO] Service d’analyse :', env.VITE_ANALYSE_API_URL)
    analyseApi
      .health()
      .then((health) => console.info('[MASO] Service d’analyse joignable, fonctions :', health.capabilities))
      .catch((error: unknown) =>
        console.error(
          '[MASO] Service d’analyse injoignable (endormi sur Render ? adresse ? ALLOWED_ORIGINS sans l’adresse de ce site ?) :',
          error,
          '— origine de ce site :',
          window.location.origin,
        ),
      )
  }

  // Toute erreur non rattrapée reste visible, avec le préfixe MASO.
  window.addEventListener('error', (event) => console.error('[MASO] Erreur JavaScript :', event.error ?? event.message))
  window.addEventListener('unhandledrejection', (event) => console.error('[MASO] Promesse rejetée sans traitement :', event.reason))
}
