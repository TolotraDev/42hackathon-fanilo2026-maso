import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useBottomNav, type NavSection } from './navigation'

function NavItem({ section }: { section: NavSection }) {
  const { t } = useTranslation()
  const Icon = section.icon

  return (
    <NavLink
      to={section.path}
      className="flex min-w-0 flex-1 flex-col items-center justify-end pb-1"
    >
      {({ isActive }) => (
        <>
          <div
            className={cn(
              'flex items-center justify-center rounded-full transition-all duration-300 ease-in-out',
              isActive
                ? '-mt-6 size-14 bg-surface text-cobalt shadow-[0_10px_20px_rgba(10,47,79,0.12)] ring-4 ring-surface dark:bg-[#0A2F4F] dark:text-white dark:ring-[#0A2F4F]'
                : 'size-6 text-ink-muted dark:text-white/70',
            )}
          >
            <Icon className={isActive ? 'size-7' : 'size-6'} strokeWidth={isActive ? 2 : 1.5} aria-hidden />
          </div>
          <span
            className={cn(
              'mt-1 max-w-full truncate px-0.5 text-[11px] font-medium transition-colors duration-300',
              isActive ? 'font-bold text-ink dark:text-white' : 'text-ink-muted dark:text-white/70',
            )}
          >
            {t(`nav.${section.id}`)}
          </span>
        </>
      )}
    </NavLink>
  )
}

/** Barre de navigation du bas dynamique avec effet flottant pour l'onglet actif. */
export function BottomNav() {
  const { t } = useTranslation()
  const { left, center, right } = useBottomNav()
  const Center = center?.icon

  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur-sm dark:border-white/10 dark:bg-[#0A2F4F]/95 lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-end px-1 pb-1">
        {left.map((section) => (
          <NavItem key={section.id} section={section} />
        ))}

        {center && Center && (
          <NavLink to={center.path} className="group flex flex-1 flex-col items-center justify-end pb-1">
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full bg-cobalt text-white transition-all duration-300',
                    isActive
                      ? '-mt-6 size-14 shadow-[0_12px_24px_rgba(25,118,210,0.35)] ring-4 ring-surface dark:ring-[#0A2F4F]'
                      : 'size-12 shadow-md',
                  )}
                >
                  <Center className={isActive ? 'size-7' : 'size-6'} aria-hidden />
                </div>
                <span
                  className={cn(
                    'mt-1 text-[11px] font-medium uppercase tracking-wide transition-colors duration-300',
                    isActive ? 'font-bold text-ink dark:text-white' : 'text-ink-muted dark:text-white/70',
                  )}
                >
                  {t(`nav.${center.id}`)}
                </span>
              </>
            )}
          </NavLink>
        )}

        {right.map((section) => (
          <NavItem key={section.id} section={section} />
        ))}
      </div>
    </nav>
  )
}