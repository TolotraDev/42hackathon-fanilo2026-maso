import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { NAV_SECTIONS } from './navigation'

/** Liste des espaces, utilisée par la barre latérale web et le menu mobile. */
export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  return (
    <ul className="space-y-1">
      {NAV_SECTIONS.map(({ id, path, icon: Icon }) => (
        <li key={id}>
          <NavLink
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
                isActive ? 'bg-cobalt text-white shadow-sm' : 'text-white/75 hover:bg-white/10 hover:text-white',
              )
            }
          >
            <Icon className="size-5" aria-hidden />
            {t(`nav.${id}`)}
          </NavLink>
        </li>
      ))}
    </ul>
  )
}
