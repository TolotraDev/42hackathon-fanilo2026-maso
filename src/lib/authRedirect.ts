// Lien d'invitation ou de réinitialisation arrivé sur une autre page que « Nouveau mot de passe »
// (par exemple si Supabase renvoie vers l'adresse principale du site) : on l'y emmène, en gardant le jeton.
// Sinon la personne serait connectée sans avoir choisi de mot de passe, et ne pourrait plus se reconnecter.
// Importé en premier dans main.tsx : doit s'exécuter avant la création du routeur.
const RESET_PATH = '/nouveau-mot-de-passe'

export function passwordLinkTarget(location: { pathname: string; hash: string; search: string }): string | null {
  const params = new URLSearchParams(location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(location.search)
  const type = params.get('type') ?? query.get('type')
  const hasToken = params.has('access_token') || query.has('code') || query.has('token_hash')
  if ((type === 'invite' || type === 'recovery') && hasToken && location.pathname !== RESET_PATH) {
    return `${RESET_PATH}${location.search}${location.hash}`
  }
  return null
}

if (typeof window !== 'undefined') {
  const target = passwordLinkTarget(window.location)
  if (target) window.history.replaceState(null, '', target)
}
