import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from './LanguageSwitcher'
import { Logo } from './Logo'
import { SideNav } from './SideNav'

/** Menu latéral mobile (bouton ☰ de la maquette) : tous les espaces + langue. */
export function MobileDrawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()

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
      <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-navy px-4 py-5 shadow-2xl" style={{ paddingTop: 'max(1.25rem, env(safe-area-inset-top))' }}>
        <div className="flex items-start justify-between gap-2">
          <Logo withTagline />
          <button type="button" onClick={onClose} aria-label={t('nav.closeMenu')} className="flex size-10 shrink-0 items-center justify-center rounded-full text-white hover:bg-white/10">
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <nav className="mt-8 flex-1">
          <SideNav onNavigate={onClose} />
        </nav>
        <LanguageSwitcher tone="dark" />
      </div>
    </div>
  )
}
