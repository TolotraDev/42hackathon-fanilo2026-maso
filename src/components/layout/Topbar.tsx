import { Moon, Search, Sun } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useTheme } from '@/hooks/useTheme'
import { LanguageSwitcher } from './LanguageSwitcher'

interface TopbarProps {
  title: string
  query: string
  onQueryChange: (query: string) => void
}

/** Barre supérieure de la version web : titre, recherche, langue, thème. */
export function Topbar({ title, query, onQueryChange }: TopbarProps) {
  const { t } = useTranslation()
  const { isDark, setPreference } = useTheme()

  return (
    <header className="sticky top-0 z-20 hidden h-16 items-center gap-4 border-b border-line bg-surface/90 px-8 backdrop-blur lg:flex">
      <h1 className="font-display text-lg font-extrabold uppercase tracking-wide text-navy dark:text-ink">{title}</h1>
      <label className="relative ml-auto w-72">
        <span className="sr-only">{t('nav.search')}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('common.searchPlaceholder')}
          className="min-h-10 w-full rounded-xl border border-line bg-canvas pl-9 pr-3 text-sm text-ink placeholder:text-ink-muted focus:border-cobalt focus:outline-none"
        />
      </label>
      <LanguageSwitcher />
      <button
        type="button"
        onClick={() => setPreference(isDark ? 'light' : 'dark')}
        aria-label={isDark ? t('profil.themeLight') : t('profil.themeDark')}
        className="flex size-10 items-center justify-center rounded-xl text-ink-muted hover:bg-line hover:text-ink"
      >
        {isDark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
      </button>
    </header>
  )
}
