// Accès aux espaces de l'interface selon le rôle (cahier des charges, section 3).
// L'interface ne fait qu'adapter l'affichage : les droits réels sont appliqués par la base (RLS).
import { STAFF_ROLES, type Role } from '@/types/domain'

export type SectionId = 'accueil' | 'veille' | 'verifier' | 'ressources' | 'rediger' | 'dossiers' | 'portail' | 'admin' | 'profil'

const STAFF = STAFF_ROLES
const EVERYONE: readonly Role[] = [...STAFF, 'admin', 'public']

export const SECTION_ROLES: Record<SectionId, readonly Role[]> = {
  accueil: STAFF,
  veille: STAFF,
  verifier: STAFF,
  ressources: EVERYONE,
  rediger: STAFF,
  dossiers: STAFF,
  // Le portail public est ouvert à tous, même sans compte : il apparaît dans le menu de chacun.
  portail: EVERYONE,
  admin: ['admin'],
  profil: EVERYONE,
}

export function isStaff(role: Role | null): boolean {
  return role !== null && STAFF.includes(role)
}

export function canAccessSection(role: Role | null, section: SectionId): boolean {
  return role !== null && SECTION_ROLES[section].includes(role)
}

/** Page d'accueil de chaque rôle après connexion. */
export function homePathFor(role: Role | null): string {
  if (isStaff(role)) return '/accueil'
  if (role === 'admin') return '/admin'
  return '/ressources'
}
