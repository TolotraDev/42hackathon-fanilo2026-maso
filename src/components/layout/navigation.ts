import { BriefcaseBusiness, FolderOpen, Globe, LayoutDashboard, Megaphone, PenLine, ShieldCheck, UserCog, UserRound, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/features/auth/AuthProvider'
import { canAccessSection, type SectionId } from '@/lib/permissions'

export interface NavSection {
  id: SectionId
  path: string
  icon: LucideIcon
}

/** Les espaces de MASO, dans l'ordre de la maquette (barre latérale web et menu). */
export const NAV_SECTIONS: NavSection[] = [
  { id: 'accueil', path: '/accueil', icon: LayoutDashboard },
  { id: 'veille', path: '/veille', icon: Megaphone },
  { id: 'verifier', path: '/verifier', icon: ShieldCheck },
  { id: 'ressources', path: '/ressources', icon: BriefcaseBusiness },
  { id: 'rediger', path: '/rediger', icon: PenLine },
  { id: 'dossiers', path: '/dossiers', icon: FolderOpen },
  { id: 'portail', path: '/portail', icon: Globe },
  { id: 'admin', path: '/admin', icon: UserCog },
  { id: 'profil', path: '/profil', icon: UserRound },
]

const byId = (id: SectionId) => NAV_SECTIONS.find((section) => section.id === id)!

/** Espaces accessibles au rôle de l'utilisateur connecté. */
export function useNavSections(): NavSection[] {
  const { role } = useAuth()
  return NAV_SECTIONS.filter((section) => canAccessSection(role, section.id))
}

/**
 * Barre du bas sur mobile. Pour l'équipe éditoriale : Vérifier, l'action principale, est le bouton central rond.
 * Pour les autres rôles (admin, invité) : les espaces accessibles, sans bouton central.
 */
export function useBottomNav(): { left: NavSection[]; center: NavSection | null; right: NavSection[] } {
  const sections = useNavSections()
  const allowed = (id: SectionId) => sections.some((section) => section.id === id)
  if (allowed('verifier')) {
    return {
      left: (['veille', 'ressources'] as const).filter(allowed).map(byId),
      center: byId('verifier'),
      right: (['rediger', 'dossiers'] as const).filter(allowed).map(byId),
    }
  }
  // Le portail public a sa propre page (hors de la coque) : il reste accessible depuis le menu.
  return { left: sections.filter((section) => section.id !== 'portail'), center: null, right: [] }
}

export function sectionFromPath(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find((section) => pathname.startsWith(section.path))
}
