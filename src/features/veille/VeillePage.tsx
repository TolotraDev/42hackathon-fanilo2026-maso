import { ExternalLink, FolderPlus, Megaphone, Radio, RefreshCw, Rss } from 'lucide-react'
import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useShellSearch } from '@/components/layout/AppShell'
import { AlertLevelBadge, Badge, Button, Card } from '@/components/ui'
import { alertsApi, type PublicAlert } from '@/features/accueil/alertsApi'
import { FormMessage } from '@/features/auth/FormMessage'
import { useCaseStore } from '@/features/dossiers/CaseStoreProvider'
import { isDataSaverOn } from '@/hooks/useDataSaver'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { analyseApi, type FeedItem } from '@/lib/analyseApi'
import { cn } from '@/lib/cn'
import { MADAGASCAR_REGIONS } from '@/lib/regions'
import { DEFAULT_SETTINGS, getSetting, type AppSettings } from '@/lib/settings'
import { readStorage, writeStorage } from '@/lib/storage'
import { matchesQuery } from '@/lib/text'
import { ALERT_LEVELS, type AlertLevel } from '@/types/domain'
import { classify, countByRegion, detectRegion, sortItems, trends, type VeilleItem } from './veilleModel'

const RegionMap = lazy(() => import('./RegionMap'))

const CACHE_KEY = 'maso.veille.cache'
const CACHE_SIZE = 50
type LevelFilter = AlertLevel | 'all'
type OriginFilter = VeilleItem['origin'] | 'all'

const LEVEL_BAR: Record<AlertLevel, string> = { high: 'bg-danger', medium: 'bg-warning', low: 'bg-success' }

function fromAlert(alert: PublicAlert, rules: AppSettings['alert_rules']): VeilleItem {
  const text = alert.text ?? alert.url ?? ''
  const { level, keywords } = classify(text, rules, alert.occurrences)
  return {
    id: `report-${alert.id}`,
    origin: 'report',
    title: text.slice(0, 160) || alert.trackingCode,
    text,
    url: alert.url,
    source: alert.platform ?? '',
    region: alert.region ?? detectRegion(text),
    date: alert.createdAt,
    level,
    keywords,
    alertId: alert.id,
    status: alert.status,
    occurrences: alert.occurrences,
  }
}

function fromFeed(item: FeedItem, rules: AppSettings['alert_rules']): VeilleItem {
  const text = `${item.title} ${item.summary}`
  const { level, keywords } = classify(text, rules)
  return {
    id: `rss-${item.link || item.title}`,
    origin: 'rss',
    title: item.title,
    text: item.summary,
    url: item.link || null,
    source: item.source,
    region: detectRegion(text),
    date: item.published_at,
    level,
    keywords,
  }
}

function readCache(): VeilleItem[] {
  try {
    return JSON.parse(readStorage(CACHE_KEY) ?? '[]') as VeilleItem[]
  } catch {
    return []
  }
}

/** M2 / W3 — Veille : signalements du public et flux RSS, niveaux, regroupement, carte par région, prise en charge. */
export function VeillePage() {
  const { t, i18n } = useTranslation()
  const shellQuery = useShellSearch()
  const online = useOnlineStatus()
  const { version } = useCaseStore()
  const [items, setItems] = useState<VeilleItem[]>(readCache)
  const [loading, setLoading] = useState(false)
  const [feedErrors, setFeedErrors] = useState(0)
  const [rssOff, setRssOff] = useState(false)
  const [level, setLevel] = useState<LevelFilter>('all')
  const [origin, setOrigin] = useState<OriginFilter>('all')
  const [region, setRegion] = useState('')
  const [keyword, setKeyword] = useState('')

  const load = useCallback(
    async (withFeeds: boolean) => {
      setLoading(true)
      const [rules, sources] = await Promise.all([
        getSetting('alert_rules').catch(() => DEFAULT_SETTINGS.alert_rules),
        getSetting('veille_sources').catch(() => DEFAULT_SETTINGS.veille_sources),
      ])
      const [alerts, feeds] = await Promise.all([
        alertsApi().list().catch(() => null),
        withFeeds && sources.length ? analyseApi.feeds(sources).catch(() => null) : Promise.resolve(undefined),
      ])
      setRssOff(feeds === null)
      setFeedErrors(feeds?.errors.length ?? 0)
      setItems((current) => {
        const keptFeeds = feeds === undefined || feeds === null ? current.filter((item) => item.origin === 'rss') : feeds.items.map((item) => fromFeed(item, rules))
        const reports = alerts ? alerts.map((alert) => fromAlert(alert, rules)) : current.filter((item) => item.origin === 'report')
        const next = sortItems([...reports, ...keptFeeds])
        // Hors connexion : les 50 dernières alertes restent consultables sur l'appareil.
        writeStorage(CACHE_KEY, JSON.stringify(next.slice(0, CACHE_SIZE)))
        return next
      })
      setLoading(false)
    },
    [],
  )

  useEffect(() => {
    // Économie de données : pas de lecture automatique des flux RSS, l'utilisateur actualise lui-même.
    if (online) void load(!isDataSaverOn())
  }, [online, version, load])

  const visible = items.filter(
    (item) =>
      (level === 'all' || item.level === level) &&
      (origin === 'all' || item.origin === origin) &&
      (!region || item.region === region) &&
      (!keyword || item.keywords.some((word) => word.toLowerCase() === keyword)) &&
      matchesQuery(shellQuery, item.title, item.text, item.source, item.region ?? ''),
  )
  const trendList = useMemo(() => trends(items).slice(0, 8), [items])
  const regionCounts = useMemo(() => countByRegion(items.filter((item) => level === 'all' || item.level === level)), [items, level])
  const countFor = (option: LevelFilter) => (option === 'all' ? items.length : items.filter((item) => item.level === option).length)
  const formatDate = (iso: string | null) => (iso ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso)) : '')
  const mapLabel = useCallback((name: string, count: number) => t('veille.mapTooltip', { region: name, count }), [t])

  const takeChargePath = (item: VeilleItem) =>
    item.alertId
      ? `/dossiers/nouveau?alerte=${item.alertId}`
      : `/dossiers/nouveau?${new URLSearchParams({ titre: item.title.slice(0, 120), affirmation: item.title, ...(item.region ? { region: item.region } : {}) })}`

  return (
    <div className="dashboard-fade space-y-4">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-line bg-surface px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-bold text-navy dark:text-ink">
          <Radio className="size-4 text-danger" aria-hidden />
          {t('veille.realtime')}
        </span>
        <span className="text-xs text-ink-muted">{t('common.resultsCount', { count: visible.length })}</span>
        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {(['all', ...ALERT_LEVELS.slice().reverse()] as LevelFilter[]).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={level === option}
              onClick={() => setLevel(option)}
              className={cn(
                'inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold',
                level === option ? 'border-cobalt bg-cobalt text-white' : 'border-line text-ink-muted hover:border-cobalt/40 hover:text-ink',
              )}
            >
              {option !== 'all' && <span className={cn('size-1.5 rounded-full', level === option ? 'bg-white' : LEVEL_BAR[option])} aria-hidden />}
              {option === 'all' ? t('veille.all') : t(`alertLevel.${option}`)}
              <span className="opacity-70">{countFor(option)}</span>
            </button>
          ))}
          <Button variant="secondary" className="min-h-8 px-2.5 text-xs" disabled={loading || !online} onClick={() => void load(true)} aria-label={t('veille.refresh')}>
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} aria-hidden />
            <span className="hidden sm:inline">{t('veille.refresh')}</span>
          </Button>
          <Link to="/dossiers/nouveau" className="inline-flex min-h-8 items-center gap-1.5 rounded-xl bg-cobalt px-2.5 text-xs font-semibold text-white hover:brightness-110">
            <Megaphone className="size-3.5" aria-hidden />
            {t('veille.reportRumor')}
          </Link>
        </div>
      </div>

      {!online && <FormMessage tone="error">{t('veille.offlineCache')}</FormMessage>}
      {online && rssOff && <p className="text-xs text-ink-muted">{t('veille.rssUnavailable')}</p>}
      {feedErrors > 0 && <p className="text-xs text-ink-muted">{t('veille.feedErrors', { count: feedErrors })}</p>}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <section className="min-w-0 space-y-2" aria-live="polite">
          <div className="flex flex-wrap gap-1.5">
            {(['all', 'report', 'rss'] as OriginFilter[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={origin === option}
                onClick={() => setOrigin(option)}
                className={cn('min-h-8 rounded-lg px-2.5 text-xs font-semibold', origin === option ? 'bg-navy text-white dark:bg-cobalt' : 'bg-surface text-ink-muted ring-1 ring-line hover:text-ink')}
              >
                {t(`veille.origin.${option}`)}
              </button>
            ))}
            <select
              value={region}
              onChange={(event) => setRegion(event.target.value)}
              aria-label={t('portail.filter.region')}
              className="min-h-8 rounded-lg border border-line bg-surface px-2 text-xs text-ink"
            >
              <option value="">{t('veille.allRegions')}</option>
              {MADAGASCAR_REGIONS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
            {keyword && (
              <button type="button" onClick={() => setKeyword('')} className="min-h-8 rounded-lg bg-cobalt/10 px-2.5 text-xs font-semibold text-cobalt">
                #{keyword} ×
              </button>
            )}
          </div>

          {visible.length === 0 && <Card className="p-6 text-center text-sm text-ink-muted">{loading ? t('auth.loading') : t('veille.empty')}</Card>}
          {visible.map((item, index) => (
            <Card key={item.id} className="dashboard-rise relative overflow-hidden p-3 pl-4" style={{ '--i': Math.min(index, 8) } as React.CSSProperties}>
              <span aria-hidden className={cn('absolute inset-y-0 left-0 w-1', LEVEL_BAR[item.level])} />
              <div className="flex flex-wrap items-center gap-1.5">
                <AlertLevelBadge level={item.level} />
                <Badge tone={item.origin === 'report' ? 'info' : 'neutral'}>
                  {item.origin === 'rss' ? <Rss className="mr-1 inline size-3" aria-hidden /> : null}
                  {t(`veille.origin.${item.origin}`)}
                </Badge>
                {item.region && <Badge>{item.region}</Badge>}
                {(item.occurrences ?? 1) > 1 && <Badge tone="warning">{t('accueil.occurrences', { count: item.occurrences })}</Badge>}
                {item.status && item.status !== 'new' && <Badge tone="success">{t(`portail.track.status.${item.status}`)}</Badge>}
              </div>
              <p className="mt-1.5 text-sm font-semibold text-ink [overflow-wrap:anywhere]">{item.title}</p>
              {item.text && item.text !== item.title && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{item.text}</p>}
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-muted">
                <span>{[item.source, formatDate(item.date)].filter(Boolean).join(' · ')}</span>
                {item.url && (
                  <a href={item.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 font-semibold text-cobalt hover:underline">
                    <ExternalLink className="size-3" aria-hidden />
                    {t('veille.open')}
                  </a>
                )}
                {(!item.status || item.status === 'new') && (
                  <Link to={takeChargePath(item)} className="ml-auto inline-flex min-h-8 items-center gap-1 font-semibold text-cobalt hover:underline">
                    <FolderPlus className="size-3.5" aria-hidden />
                    {t('veille.takeCharge')}
                  </Link>
                )}
              </div>
            </Card>
          ))}
        </section>

        <aside className="space-y-4">
          <Card className="space-y-2 p-3">
            <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('veille.map')}</p>
            {online ? (
              <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-line/60" />}>
                <RegionMap counts={regionCounts} selected={region} onSelect={setRegion} label={mapLabel} ariaLabel={t('veille.map')} />
              </Suspense>
            ) : (
              <ul className="space-y-1 text-xs">
                {[...regionCounts].map(([name, { count }]) => <li key={name}>{name} : {count}</li>)}
              </ul>
            )}
          </Card>
          <Card className="space-y-2 p-3">
            <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('veille.trends')}</p>
            {trendList.length === 0 && <p className="text-xs text-ink-muted">{t('veille.noTrend')}</p>}
            <div className="flex flex-wrap gap-1.5">
              {trendList.map((trend) => (
                <button
                  key={trend.keyword}
                  type="button"
                  aria-pressed={keyword === trend.keyword}
                  onClick={() => setKeyword(keyword === trend.keyword ? '' : trend.keyword)}
                  className={cn(
                    'inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-semibold',
                    keyword === trend.keyword ? 'border-cobalt bg-cobalt text-white' : 'border-line text-ink hover:border-cobalt/50',
                  )}
                >
                  <span className={cn('size-1.5 rounded-full', LEVEL_BAR[trend.level])} aria-hidden />
                  #{trend.keyword}
                  <span className="opacity-70">{trend.count}</span>
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}
