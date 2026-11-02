import { BarChart3, Library, Newspaper, Plus, Settings2, Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useShellSearch } from '@/components/layout/AppShell'
import { Avatar, Badge, Card, Input, ListRow, SectionTitle } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { cn } from '@/lib/cn'
import { matchesQuery } from '@/lib/text'
import { LANGUAGES } from '@/types/domain'
import { PackNotice } from './PackNotice'
import { filterPeople, needsRevalidation } from './rules'
import { canManageResources } from './types'
import { useDirectory } from './useResources'

const SELECT = 'min-h-10 w-full rounded-xl border border-line bg-canvas px-2 text-xs text-ink focus:border-cobalt focus:outline-none'

/** M8 — Ressources : statistiques, annuaire des médias et des personnes-ressources (maquette « Base de données »). */
export function RessourcesPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { role } = useAuth()
  const shellQuery = useShellSearch()
  const { people, notes, pack, error } = useDirectory()
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ domain: '', region: '', language: '', organization: '', favoritesOnly: false })
  const isGuest = role === 'public'
  const manager = canManageResources(role)
  const proposed = (useLocation().state as { proposed?: boolean } | null)?.proposed

  const options = useMemo(() => {
    const list = people ?? []
    const unique = (values: Array<string | null>) => [...new Set(values.filter((value): value is string => Boolean(value)))].sort()
    return {
      domains: unique(list.flatMap((person) => person.domains)),
      regions: unique(list.map((person) => person.region)),
      organizations: unique(list.map((person) => person.organization)),
    }
  }, [people])

  const favorites = useMemo(() => new Set(Object.entries(notes).filter(([, note]) => note.favorite).map(([id]) => id)), [notes])
  const visible = people
    ? filterPeople(people, { query: `${query} ${shellQuery}`.trim(), ...filters }, favorites, matchesQuery)
    : []

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
      <Card className="divide-y divide-line overflow-hidden">
        <ListRow icon={BarChart3} title={t('ressources.statistics')} subtitle={t('ressources.statisticsHint')} onClick={() => navigate('/ressources/statistiques')} />
        {!isGuest && (
          <ListRow icon={Newspaper} title={t('ressources.mediaDirectory')} subtitle={t('ressources.mediaDirectoryHint')} onClick={() => navigate('/ressources/sources')} />
        )}
        <ListRow
          icon={Library}
          title={t('ressources.reportLibrary')}
          subtitle={t('ressources.reportLibraryHint')}
          trailing={<Badge>{t('verifier.soon')}</Badge>}
          className="cursor-default opacity-70 hover:bg-transparent"
        />
      </Card>

      <section className="space-y-3">
        <SectionTitle
          action={
            !isGuest && (
              <div className="flex gap-1">
                {manager && (
                  <Link to="/ressources/annuaire" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cobalt hover:bg-cobalt/10">
                    <Settings2 className="size-4" aria-hidden />
                    {t('ressources.manage')}
                  </Link>
                )}
                <Link to="/ressources/personnes/nouvelle" className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-cobalt hover:bg-cobalt/10">
                  <Plus className="size-4" aria-hidden />
                  {manager ? t('ressources.addPerson') : t('ressources.proposePerson')}
                </Link>
              </div>
            )
          }
        >
          {t('ressources.people')}
        </SectionTitle>

        <PackNotice pack={pack} />
        {proposed && <FormMessage tone="success">{t('ressources.form.proposalSent')}</FormMessage>}
        {error && <FormMessage tone="error">{error}</FormMessage>}

        <Card className="space-y-2 p-3">
          <Input
            type="search"
            aria-label={t('ressources.searchPeople')}
            placeholder={t('ressources.searchPeople')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {([
              ['domain', options.domains],
              ['region', options.regions],
              ['language', [...LANGUAGES]],
              ['organization', options.organizations],
            ] as const).map(([key, values]) => (
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
            <label className="flex min-h-9 cursor-pointer items-center gap-2 text-xs font-semibold text-ink">
              <input type="checkbox" checked={filters.favoritesOnly} onChange={(event) => setFilters({ ...filters, favoritesOnly: event.target.checked })} />
              {t('ressources.favoritesOnly')}
            </label>
          )}
        </Card>

        <Card className="divide-y divide-line overflow-hidden">
          {people === null && !error && <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('auth.loading')}</p>}
          {people !== null && (
            <p className="px-4 py-2 text-xs text-ink-muted">{t('ressources.peopleCount', { count: visible.length })}</p>
          )}
          {visible.map((person) => (
            <ListRow
              key={person.id}
              leading={<Avatar name={person.fullName} />}
              title={person.fullName}
              subtitle={[person.position, person.organization].filter(Boolean).join(' · ')}
              onClick={() => navigate(`/ressources/personnes/${person.id}`)}
              trailing={
                <span className="flex shrink-0 items-center gap-1.5">
                  {manager && !person.validated && <Badge tone="warning">{t('ressources.status.pending')}</Badge>}
                  {manager && person.validated && needsRevalidation(person) && <Badge tone="warning">{t('ressources.status.revalidate')}</Badge>}
                  {favorites.has(person.id) && <Star className="size-4 fill-warning text-warning" aria-label={t('ressources.favorite')} />}
                </span>
              }
              className={cn(!person.active && 'opacity-60')}
            />
          ))}
          {people !== null && visible.length === 0 && <p className="px-4 py-6 text-center text-sm text-ink-muted">{t('common.noResult')}</p>}
        </Card>
        {isGuest && <p className="text-center text-xs text-ink-muted">{t('ressources.guestHint')}</p>}
      </section>
    </div>
  )
}
