import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { SideNav } from './SideNav'
import { UserBadge } from './UserBadge'

/** Menu latéral mobile (bouton ☰ de la maquette) : tous les espaces + langue. */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const { isDark } = useTheme()

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label={t('nav.main')}>
      <button type="button" aria-label={t('nav.closeMenu')} onClick={onClose} className="absolute inset-0 bg-navy/50" />
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-surface px-4 py-5 shadow-2xl dark:bg-navy" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <div className="flex items-start justify-between gap-2">
          <Logo withTagline tone={isDark ? 'dark' : 'light'} />
          <button type="button" onClick={onClose} aria-label={t('nav.closeMenu')} className="flex size-10 shrink-0 items-center justify-center rounded-full text-ink hover:bg-canvas dark:text-white dark:hover:bg-white/10">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav className="mt-8 flex-1">
          <SideNav onNavigate={onClose} />
        </nav>
        <UserBadge onNavigate={onClose} />
        <LanguageSwitcher tone={isDark ? 'dark' : 'light'} className="mt-3" />
      </div>
    </div>
  )
}
