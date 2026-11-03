import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/cn'
import { useNavSections } from './navigation'

/** Liste des espaces, utilisée par la barre latérale web et le menu mobile. */
export function SideNav({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useTranslation()
  const sections = useNavSections()
  return (
    <ul className="space-y-1.5">
      {sections.map(({ id, path, icon: Icon }) => (
        <li key={id}>
          <NavLink
            to={path}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition',
                isActive
                  ? 'bg-cobalt text-white shadow-[0_8px_16px_rgba(25,118,210,0.25)] dark:shadow-sm'
                  : 'text-ink-muted hover:bg-canvas hover:text-navy dark:text-white/75 dark:hover:bg-white/10 dark:hover:text-white',
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
