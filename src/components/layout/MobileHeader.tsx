import { Menu, Search, Settings, X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { NetworkStatus } from './NetworkStatus'

interface MobileHeaderProps {
  title: string
  query: string
  searchOpen: boolean
  onQueryChange: (query: string) => void
  onSearchToggle: () => void
  onMenuOpen: () => void
}

/** Bandeau bleu marine de la maquette : menu, titre en capitales, recherche, paramètres. */
export function MobileHeader({ title, query, searchOpen, onQueryChange, onSearchToggle, onMenuOpen }: MobileHeaderProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (searchOpen) inputRef.current?.focus()
  }, [searchOpen])

  return (
    <header className="sticky top-0 z-30 bg-navy text-white lg:hidden" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex h-12 items-center justify-between px-2">
        <button type="button" onClick={onMenuOpen} aria-label={t('nav.openMenu')} className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
          <Menu className="size-6" aria-hidden />
        </button>
        <NetworkStatus className="text-white/75" />
        <div className="flex">
          <button
            type="button"
            onClick={onSearchToggle}
            aria-label={searchOpen ? t('nav.closeSearch') : t('nav.search')}
            aria-expanded={searchOpen}
            className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
          >
            {searchOpen ? <X className="size-5" aria-hidden /> : <Search className="size-5" aria-hidden />}
          </button>
          <Link to="/profil" aria-label={t('nav.settings')} className="flex size-11 items-center justify-center rounded-full hover:bg-white/10">
            <Settings className="size-5" aria-hidden />
          </Link>
        </div>
      </div>
      {searchOpen ? (
        <div className="px-4 pb-3">
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t('common.searchPlaceholder')}
            aria-label={t('nav.search')}
            className="min-h-11 w-full rounded-xl bg-white/12 px-3.5 text-sm text-white placeholder:text-white/60 focus:bg-white/18 focus:outline-none"
          />
        </div>
      ) : (
        <h1 className="px-4 pb-3 pt-1 font-display text-lg font-extrabold uppercase tracking-wide">{title}</h1>
      )}
    </header>
  )
}
