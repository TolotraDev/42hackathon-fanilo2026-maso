import { BarChart3, Library, Newspaper, Plus, Settings2, Star, User } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useShellSearch } from '@/components/layout/AppShell'
import { Badge, Card, Input, SectionTitle } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { cn } from '@/lib/cn'
import { matchesQuery } from '@/lib/text'
import { LANGUAGES } from '@/types/domain'
import { PackNotice } from './PackNotice'
import { filterPeople, needsRevalidation } from './rules'
import { canManageResources } from './types'
import { useDirectory } from './useResources'

const SELECT =
  'min-h-11 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink transition-colors duration-150 hover:border-cobalt/50 focus:border-cobalt focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/20'

const ACTION_LINK =
  'inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-cobalt transition-colors duration-150 hover:bg-cobalt/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt'

const ICON_TONES = {
  cobalt: 'bg-cobalt/10 text-cobalt',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/10 text-warning',
}

/** M8 — Ressources : statistiques, annuaire des médias et des personnes-ressources. */
export function RessourcesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role } = useAuth()
  const shellQuery = useShellSearch()
  const { people, notes, pack, error } = useDirectory()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({
    domain: '',
    region: '',
    language: '',
    organization: '',
    favoritesOnly: false,
  })
  
  const isGuest = role === 'public'
  const manager = canManageResources(role)
  const proposed = (useLocation().state as { proposed?: boolean } | null)?.proposed

  const options = useMemo(() => {
    const list = people ?? []
    const unique = (values: Array<string | null>) =>
      [...new Set(values.filter((value): value is string => Boolean(value)))].sort()
    return {
      domains: unique(list.flatMap((person) => person.domains)),
      regions: unique(list.map((person) => person.region)),
      organizations: unique(list.map((person) => person.organization)),
    }
  }, [people])

  const favorites = useMemo(
    () => new Set(Object.entries(notes).filter(([, note]) => note.favorite).map(([id]) => id)),
    [notes],
  )

  const deferredQuery = useDeferredValue(query)

  const visible = useMemo(
    () =>
      people
        ? filterPeople(
            people,
            { query: deferredQuery, shellQuery, ...filters },
            favorites,
            matchesQuery,
          )
        : [],
    [people, deferredQuery, shellQuery, filters, favorites],
  )

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
      
      {/* En-tête de page */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between dashboard-rise">
        <div>
          <h1 className="text-2xl font-display font-bold text-ink">
            {t('nav.resources', 'Ressources')}
          </h1>
          <p className="text-sm text-ink-muted">
            {t('nav.resourcesHint', 'Trouvez les experts et les sources fiables.')}
          </p>
        </div>
      </div>

      <PackNotice pack={pack} />
      {proposed && <FormMessage tone="success">{t('ressources.form.proposalSent')}</FormMessage>}
      {error && <FormMessage tone="error">{error}</FormMessage>}

      {/* BLOC DU HAUT : Les deux cartes en parallèle */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        
        {/* 1. Navigation (Gauche) */}
        <Card className="overflow-hidden p-2 dashboard-rise" style={{ '--i': 1 } as CSSProperties}>
          <nav className="flex flex-col gap-1">
            <Link
              to="/ressources/statistiques"
              className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas"
            >
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", ICON_TONES.cobalt)}>
                <BarChart3 className="size-5" />
              </div>
              <div className="flex-1">
                <span className="block text-sm font-semibold text-ink group-hover:text-cobalt">
                  {t('ressources.statistics')}
                </span>
                <span className="block text-xs text-ink-muted">
                  {t('ressources.statisticsHint')}
                </span>
              </div>
            </Link>

            {!isGuest && (
              <Link
                to="/ressources/sources"
                className="group flex items-center gap-3 rounded-xl p-3 transition-colors hover:bg-canvas"
              >
                <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", ICON_TONES.success)}>
                  <Newspaper className="size-5" />
                </div>
                <div className="flex-1">
                  <span className="block text-sm font-semibold text-ink group-hover:text-success">
                    {t('ressources.mediaDirectory')}
                  </span>
                  <span className="block text-xs text-ink-muted">
                    {t('ressources.mediaDirectoryHint')}
                  </span>
                </div>
              </Link>
            )}

            <div className="flex items-center gap-3 rounded-xl p-3 opacity-60 cursor-not-allowed">
              <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", ICON_TONES.warning)}>
                <Library className="size-5" />
              </div>
              <div className="flex-1">
                <span className="block text-sm font-semibold text-ink">
                  {t('ressources.reportLibrary')}
                </span>
                <span className="block text-xs text-ink-muted">
                  {t('ressources.reportLibraryHint')}
                </span>
              </div>
              <Badge tone="neutral">{t('verifier.soon')}</Badge>
            </div>
          </nav>
        </Card>

        {/* 2. Filtres (Droite) */}
        <Card className="dashboard-rise space-y-3 p-4" style={{ '--i': 2 } as CSSProperties}>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-bold text-ink">
              {t('ressources.people')}
            </h2>
            {!isGuest && (
              <div className="flex gap-2">
                {manager && (
                  <Link to="/ressources/annuaire" className={ACTION_LINK}>
                    <Settings2 className="size-4" aria-hidden />
                    <span className="hidden sm:inline">{t('ressources.manage')}</span>
                  </Link>
                )}
                <Link to="/ressources/personnes/nouvelle" className={ACTION_LINK}>
                  <Plus className="size-4" aria-hidden />
                  <span>{manager ? t('ressources.addPerson') : t('ressources.proposePerson')}</span>
                </Link>
              </div>
            )}
          </div>

          <Input
            type="search"
            aria-label={t('ressources.searchPeople')}
            placeholder={t('ressources.searchPeople')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="bg-canvas/50"
          />
          
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-2">
            {(
              [
                ['domain', options.domains],
                ['region', options.regions],
                ['language', [...LANGUAGES]],
                ['organization', options.organizations],
              ] as const
            ).map(([key, values]) => (
              <select
                key={key}
                aria-label={t(`ressources.filter.${key}`)}
                className={SELECT}
                value={filters[key]}
                onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}
              >
                <option value="">{t(`ressources.filter.${key}`)}</option>
                {values.map((value) => (
                  <option key={value} value={value}>
                    {key === 'language' ? t(`language.${value}`) : value}
                  </option>
                ))}
              </select>
            ))}
          </div>

          {!isGuest && (
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm font-medium text-ink transition-colors hover:text-cobalt">
              <input
                type="checkbox"
                className="size-4 rounded border-line accent-cobalt focus-visible:ring-2 focus-visible:ring-cobalt/40"
                checked={filters.favoritesOnly}
                onChange={(event) =>
                  setFilters({ ...filters, favoritesOnly: event.target.checked })
                }
              />
              {t('ressources.favoritesOnly')}
            </label>
          )}
        </Card>
      </div>

      {/* BLOC DU BAS : La liste des contacts */}
      <div className="space-y-3">
        {people !== null && (
          <p className="dashboard-fade px-1 text-sm font-medium text-ink-muted">
            {t('ressources.peopleCount', { count: visible.length })}
          </p>
        )}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {people === null && !error && (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={`skeleton-${i}`} className="flex items-center gap-4 p-4 animate-pulse">
                <div className="size-12 rounded-full bg-line" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 rounded bg-line" />
                  <div className="h-3 w-1/2 rounded bg-line" />
                </div>
              </Card>
            ))
          )}

          {visible.map((person, index) => (
            <Card
              key={person.id}
              onClick={() => navigate(`/ressources/personnes/${person.id}`)}
              className={cn(
                'dashboard-rise group flex cursor-pointer items-center gap-4 p-3 transition-all duration-200 hover:border-cobalt/30 hover:shadow-sm',
                !person.active && 'opacity-60'
              )}
              style={{ '--i': Math.min(index + 3, 12) } as CSSProperties}
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-cobalt/10 text-cobalt font-bold text-lg">
                {person.fullName.substring(0, 2).toUpperCase()}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="truncate text-base font-semibold text-ink group-hover:text-cobalt">
                  {person.fullName}
                </h3>
                <p className="truncate text-sm text-ink-muted">
                  {[person.position, person.organization].filter(Boolean).join(' · ')}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {manager && !person.validated && <Badge tone="warning">{t('ressources.status.pending')}</Badge>}
                {manager && person.validated && needsRevalidation(person) && (
                  <Badge tone="warning">{t('ressources.status.revalidate')}</Badge>
                )}
                {favorites.has(person.id) && (
                  <Star className="size-4 fill-warning text-warning" aria-label={t('ressources.favorite')} />
                )}
              </div>
            </Card>
          ))}
        </div>

        {people !== null && visible.length === 0 && (
          <Card className="dashboard-fade flex flex-col items-center justify-center p-8 text-center text-ink-muted">
            <User className="mb-2 size-8 text-line" />
            <p className="text-sm">{t('common.noResult')}</p>
          </Card>
        )}
        
        {isGuest && (
          <p className="dashboard-fade text-center text-xs text-ink-muted mt-4">
            {t('ressources.guestHint')}
          </p>
        )}
      </div>
    </div>
  )
}