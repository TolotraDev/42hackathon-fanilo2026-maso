import { useLocation } from 'react-router-dom'

/** Les pages Ressources servent à la fois dans l'application et dans l'espace public : on garde l'espace d'origine. */
export function useResourcesBase(): string {
  return useLocation().pathname.startsWith('/portail') ? '/portail/ressources' : '/ressources'
}
