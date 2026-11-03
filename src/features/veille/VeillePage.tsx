import { CloudRain, Megaphone, Radio, Plus, ArrowUpRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellSearch } from '@/components/layout/AppShell'
import { AlertLevelBadge, Avatar, Badge, Button, Card, DemoNotice } from '@/components/ui'
import { DEMO_ALERTS, type DemoAlert } from '@/data/demo/alerts'
import { cn } from '@/lib/cn'
import { matchesQuery } from '@/lib/text'
import { ALERT_LEVELS, type AlertLevel } from '@/types/domain'

type LevelFilter = AlertLevel | 'all'

const LEVEL_DOT: Record<AlertLevel, string> = {
  high: 'bg-danger text-danger',
  medium: 'bg-warning text-warning',
  low: 'bg-success text-success',
}

const LEVEL_BAR: Record<AlertLevel, string> = {
  high: 'bg-danger',
  medium: 'bg-warning',
  low: 'bg-success',
}

function AlertMeta({ alert }: { alert: DemoAlert }) {
  const { t } = useTranslation()
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-ink-muted">
      <Avatar name={alert.source} className="size-5 shrink-0 text-[8px]" />
      <span className="truncate">{alert.source}</span>
      <span aria-hidden className="shrink-0">·</span>
      <span className="shrink-0 whitespace-nowrap">{t('common.minutesAgo', { count: alert.minutesAgo })}</span>
    </div>
  )
}

/** M2 / W3 — Fil de veille (maquette « Flux d'actualités »). */
export function VeillePage() {
  const { t } = useTranslation()
  const query = useShellSearch()
  const [level, setLevel] = useState<LevelFilter>('all')

  const alerts = DEMO_ALERTS.filter(
    (alert) => (level === 'all' || alert.level === level) && matchesQuery(query, alert.title, alert.source, alert.region),
  )
  const [featured, ...others] = alerts

  const options: LevelFilter[] = ['all', ...ALERT_LEVELS.slice().reverse()]
  const countFor = (option: LevelFilter) =>
    option === 'all' ? DEMO_ALERTS.length : DEMO_ALERTS.filter((alert) => alert.level === option).length

  return (
    <div className="dashboard-fade space-y-4">
      {/* Barre de contrôle */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2">
        <span className="flex items-center gap-2 text-sm font-bold text-navy dark:text-ink">
          <Radio className="size-4 text-danger" aria-hidden />
          {t('veille.realtime')}
        </span>
        <span className="hidden text-xs text-ink-muted sm:inline">
          {t('common.resultsCount', { count: alerts.length, defaultValue: `${alerts.length} résultat(s)` })}
        </span>
        <div className="ml-auto flex items-center gap-1.5 overflow-x-auto">
          {options.map((option) => {
            const active = level === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={active}
                onClick={() => setLevel(option)}
                className={cn(
                  'veille-chip inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold',
                  active
                    ? 'border-cobalt bg-cobalt text-white'
                    : 'border-line text-ink-muted hover:border-cobalt/40 hover:text-ink',
                )}
              >
                {option !== 'all' && (
                  <span className={cn('size-1.5 rounded-full', active ? 'bg-white' : LEVEL_BAR[option])} aria-hidden />
                )}
                {option === 'all' ? t('veille.all') : t(`alertLevel.${option}`)}
                <span className={cn('text-[10px] font-bold', active ? 'text-white/80' : 'text-ink-muted')}>
                  {countFor(option)}
                </span>
              </button>
            )
          })}
        </div>
        <Button variant="secondary" className="ml-1 hidden min-h-8 text-xs lg:inline-flex">
          <Plus className="size-3.5" aria-hidden />
          {t('veille.reportRumor')}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px] lg:items-start">
        {/* Flux vertical dense */}
        <div className="min-w-0">
          {!featured && (
            <p className="rounded-xl border border-dashed border-line py-12 text-center text-sm text-ink-muted">
              {t('common.noResult')}
            </p>
          )}

          {others.length > 0 && (
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
              {others.map((alert, index) => (
                <li key={alert.id} className="veille-in" style={{ ['--i' as string]: index }}>
                  <a
                    href="#"
                    className="veille-row flex items-start gap-3 px-4 py-3"
                    onClick={(event) => event.preventDefault()}
                  >
                    <span
                      aria-hidden
                      className={cn('veille-dot mt-1.5 size-2 shrink-0 rounded-full', LEVEL_DOT[alert.level])}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-[11px] text-ink-muted">
                        <span className="truncate font-medium uppercase tracking-wide">{alert.region}</span>
                        <span aria-hidden>·</span>
                        <span className="shrink-0">{t(`alertLevel.${alert.level}`)}</span>
                      </div>
                      <h3 className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink">
                        {alert.title}
                      </h3>
                      <div className="mt-1">
                        <AlertMeta alert={alert} />
                      </div>
                    </div>
                    <ArrowUpRight
                      className="row-arrow mt-1 size-4 shrink-0 text-ink-muted"
                      aria-hidden
                    />
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-4">
          {/* Article vedette */}
          {featured && (
            <Card
              className="veille-in overflow-hidden"
              style={{ ['--i' as string]: 0 }}
            >
              <div className="relative flex h-28 items-center justify-center bg-gradient-to-br from-navy to-cobalt">
                <CloudRain className="size-10 text-white/35" aria-hidden />
                {featured.level === 'high' && (
                  <Badge tone="danger" solid className="absolute left-2 top-2 text-[10px]">
                    {t('veille.urgent')}
                  </Badge>
                )}
              </div>
              <div className="space-y-2 p-3">
                <div className="flex items-center gap-1.5 text-[10px] text-ink-muted">
                  <span className="font-semibold uppercase tracking-wide">{featured.region}</span>
                  <span aria-hidden>·</span>
                  <AlertLevelBadge level={featured.level} />
                </div>
                <h2 className="line-clamp-3 text-sm font-bold leading-snug text-ink">{featured.title}</h2>
                <AlertMeta alert={featured} />
                <Button className="mt-1 min-h-8 w-full text-xs">{t('veille.takeCharge')}</Button>
              </div>
            </Card>
          )}

          {/* Résumé de répartition */}
          <Card className="veille-in p-3" style={{ ['--i' as string]: 1 }}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
              {t('veille.breakdown', { defaultValue: 'Répartition' })}
            </p>
            <ul className="space-y-2">
              {ALERT_LEVELS.slice().reverse().map((lvl) => {
                const count = countFor(lvl)
                const pct = DEMO_ALERTS.length ? (count / DEMO_ALERTS.length) * 100 : 0
                return (
                  <li key={lvl} className="flex items-center gap-2">
                    <span className="w-14 shrink-0 text-[11px] text-ink-muted">
                      {t(`alertLevel.${lvl}`)}
                    </span>
                    <span className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-line/60">
                      <span
                        className={cn('veille-bar absolute inset-y-0 left-0 rounded-full', LEVEL_BAR[lvl])}
                        style={{ width: `${pct}%` }}
                      />
                    </span>
                    <span className="w-5 shrink-0 text-right text-[11px] font-semibold text-ink">
                      {count}
                    </span>
                  </li>
                )
              })}
            </ul>
          </Card>
        </aside>
      </div>

      <DemoNotice module="MOD-07" />
    </div>
  )
}