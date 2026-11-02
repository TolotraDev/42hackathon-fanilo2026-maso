import { useTranslation } from 'react-i18next'
import { Logo } from './Logo'
import { NetworkStatus } from './NetworkStatus'
import { SideNav } from './SideNav'
import { UserBadge } from './UserBadge'

/** Barre latérale bleu marine de la version web (≥ 1024 px). */
export function Sidebar() {
  const { t } = useTranslation()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col bg-navy px-4 py-6 lg:flex">
      <Logo withTagline />
      <nav aria-label={t('nav.main')} className="mt-8 flex-1">
        <SideNav />
      </nav>
      <UserBadge />
      <NetworkStatus className="mt-3 px-3 text-white/70" />
    </aside>
  )
}
