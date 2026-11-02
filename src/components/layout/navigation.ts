import { BriefcaseBusiness, FolderOpen, Megaphone, PenLine, ShieldCheck, UserRound, type LucideIcon } from 'lucide-react'

export type SectionId = 'veille' | 'verifier' | 'ressources' | 'rediger' | 'dossiers' | 'profil'

export interface NavSection {
  id: SectionId
  path: string
  icon: LucideIcon
}

/** Les espaces de MASO, dans l'ordre de la maquette (barre latérale web et menu). */
export const NAV_SECTIONS: NavSection[] = [
  { id: 'veille', path: '/veille', icon: Megaphone },
  { id: 'verifier', path: '/verifier', icon: ShieldCheck },
  { id: 'ressources', path: '/ressources', icon: BriefcaseBusiness },
  { id: 'rediger', path: '/rediger', icon: PenLine },
  { id: 'dossiers', path: '/dossiers', icon: FolderOpen },
  { id: 'profil', path: '/profil', icon: UserRound },
]

const byId = (id: SectionId) => NAV_SECTIONS.find((section) => section.id === id)!

/** Barre du bas sur mobile : Vérifier, l'action principale, est le bouton central rond. */
export const BOTTOM_NAV = {
  left: [byId('veille'), byId('ressources')],
  center: byId('verifier'),
  right: [byId('rediger'), byId('dossiers')],
}

export function sectionFromPath(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find((section) => pathname.startsWith(section.path))
}
