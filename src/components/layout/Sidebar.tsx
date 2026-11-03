import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { Logo } from './Logo'
import { NetworkStatus } from './NetworkStatus'
import { SideNav } from './SideNav'
import { UserBadge } from './UserBadge'

/** Barre latérale de la version web (≥ 1024 px) : claire en mode clair, bleu marine en mode sombre. */
export function Sidebar() {
  const { t } = useTranslation()
  const { isDark } = useTheme()
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-line bg-surface px-4 py-6 lg:flex dark:border-transparent dark:bg-navy">
      <Logo withTagline tone={isDark ? 'dark' : 'light'} />
      <nav aria-label={t('nav.main')} className="mt-10 flex-1">
        <SideNav />
      </nav>
      <UserBadge />
      <NetworkStatus className="mt-3 px-3 text-ink-muted dark:text-white/70" />
    </aside>
  )
}
