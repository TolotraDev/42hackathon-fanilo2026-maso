import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useOutletContext } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { MobileDrawer } from './MobileDrawer'
import { MobileHeader } from './MobileHeader'
import { OfflineBanner } from './NetworkStatus'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { sectionFromPath } from './navigation'

interface ShellContext {
  query: string
}

/** Recherche saisie dans l'en-tête, partagée avec la page affichée. */
export function useShellSearch(): string {
  return useOutletContext<ShellContext>().query
}

/**
 * Coque unique de l'application : même contenu sur mobile et sur web,
 * seule la navigation change de place (barre du bas ↔ barre latérale).
 */
export function AppShell() {
  const { t } = useTranslation()
  const { pathname } = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [search, setSearch] = useState({ path: pathname, query: '' })

  // La recherche est propre à chaque page : elle repart à zéro quand on change d'espace.
  const query = search.path === pathname ? search.query : ''
  const setQuery = (next: string) => setSearch({ path: pathname, query: next })

  const section = sectionFromPath(pathname)
  const title = section ? t(`page.${section.id}`) : pathname.startsWith('/notifications') ? t('notifications.title') : t('app.name')

  return (
    <div className="min-h-dvh lg:pl-64">
      <Sidebar />
      <MobileHeader
        title={title}
        query={query}
        searchOpen={searchOpen}
        onQueryChange={setQuery}
        onSearchToggle={() => {
          setSearchOpen((open) => !open)
          setQuery('')
        }}
        onMenuOpen={() => setMenuOpen(true)}
      />
      <MobileDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <Topbar title={title} query={query} onQueryChange={setQuery} />
      <OfflineBanner />
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6">
        <Outlet context={{ query } satisfies ShellContext} />
      </main>
      <BottomNav />
    </div>
  )
}
