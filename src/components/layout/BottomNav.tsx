import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { BOTTOM_NAV, type NavSection } from './navigation'

function NavItem({ section }: { section: NavSection }) {
  const { t } = useTranslation()
  const Icon = section.icon
  return (
    <NavLink
      to={section.path}
      className={({ isActive }) =>
        cn('flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-center text-[11px] font-semibold leading-tight', isActive ? 'text-cobalt' : 'text-ink-muted')
      }
    >
      <Icon className="size-5" aria-hidden />
      {t(`nav.${section.id}`)}
    </NavLink>
  )
}

/** Barre de navigation du bas avec bouton central rond (maquette mobile). */
export function BottomNav() {
  const { t } = useTranslation()
  const Center = BOTTOM_NAV.center.icon
  return (
    <nav
      aria-label={t('nav.main')}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="mx-auto flex max-w-lg items-end px-1">
        {BOTTOM_NAV.left.map((section) => (
          <NavItem key={section.id} section={section} />
        ))}
        <NavLink to={BOTTOM_NAV.center.path} className="group flex flex-1 flex-col items-center pb-1.5">
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  '-mt-6 flex size-14 items-center justify-center rounded-full bg-cobalt text-white shadow-lg ring-4 ring-surface transition group-active:scale-95',
                  isActive && 'brightness-110',
                )}
              >
                <Center className="size-7" aria-hidden />
              </span>
              <span className={cn('mt-0.5 text-[11px] font-bold uppercase', isActive ? 'text-cobalt' : 'text-ink-muted')}>
                {t(`nav.${BOTTOM_NAV.center.id}`)}
              </span>
            </>
          )}
        </NavLink>
        {BOTTOM_NAV.right.map((section) => (
          <NavItem key={section.id} section={section} />
        ))}
      </div>
    </nav>
  )
}
