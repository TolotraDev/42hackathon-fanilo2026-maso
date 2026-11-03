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
 * Barre du bas sur mobile : chaque rôle a son action principale au centre, en bouton rond bleu.
 * Équipe éditoriale : Vérifier · administration : Administration · public : Ressources.
 */
export function useBottomNav(): { left: NavSection[]; center: NavSection | null; right: NavSection[] } {
  const sections = useNavSections()
  const allowed = (id: SectionId) => sections.some((section) => section.id === id)
  const pick = (ids: SectionId[]) => ids.filter(allowed).map(byId)
  if (allowed('verifier')) {
    return { left: pick(['veille', 'ressources']), center: byId('verifier'), right: pick(['rediger', 'dossiers']) }
  }
  if (allowed('admin')) {
    return { left: pick(['portail', 'ressources']), center: byId('admin'), right: pick(['profil']) }
  }
  const center = allowed('ressources') ? byId('ressources') : null
  return { left: pick(['portail']), center, right: pick(['profil']) }
}

export function sectionFromPath(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find((section) => pathname.startsWith(section.path))
}
