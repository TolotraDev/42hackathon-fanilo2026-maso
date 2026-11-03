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
      className="flex flex-1 flex-col items-center justify-end pb-1"
    >
      {({ isActive }) => (
        <>
          {/* L'icône change de taille et de couleur si active */}
          <div
            className={cn(
              'flex items-center justify-center transition-all duration-300 ease-in-out',
              isActive
                ? '-mt-6 size-14 rounded-full bg-white text-[#1976D2] shadow-lg ring-4 ring-white' // Effet flottant
                : 'size-6 text-[#6ACECY]'
            )}
          >
            <Icon className={isActive ? 'size-7' : 'size-6'} strokeWidth={isActive ? 2 : 1.5} aria-hidden />
          </div>
          {/* Le label change de couleur et de poids */}
          <span
            className={cn(
              'mt-1 text-[11px] font-inter transition-colors duration-300',
              isActive ? 'font-bold text-[#0A2F4F]' : 'font-medium text-[#6ACECY]'
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
      className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white lg:hidden"
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
                {/* Le bouton central est toujours en Cobalt, mais change de taille si actif */}
                <div
                  className={cn(
                    'flex items-center justify-center rounded-full bg-[#1976D2] text-white transition-all duration-300',
                    isActive
                      ? '-mt-6 size-14 shadow-lg ring-4 ring-white'
                      : 'size-12 shadow-md'
                  )}
                >
                  <Center className={isActive ? 'size-7' : 'size-6'} aria-hidden />
                </div>
                <span
                  className={cn(
                    'mt-1 text-[11px] font-inter uppercase tracking-wide transition-colors duration-300',
                    isActive ? 'font-bold text-[#0A2F4F]' : 'font-medium text-[#6ACECY]'
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