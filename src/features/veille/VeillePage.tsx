import { CloudRain, Megaphone, Radio } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellSearch } from '@/components/layout/AppShell'
import { AlertLevelBadge, Avatar, Badge, Button, Card, DemoNotice, SectionTitle } from '@/components/ui'
import { DEMO_ALERTS, type DemoAlert } from '@/data/demo/alerts'
import { cn } from '@/lib/cn'
import { matchesQuery } from '@/lib/text'
import { ALERT_LEVELS, type AlertLevel } from '@/types/domain'

type LevelFilter = AlertLevel | 'all'

function AlertMeta({ alert }: { alert: DemoAlert }) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 text-xs text-ink-muted">
      <Avatar name={alert.source} className="size-6 text-[9px]" />
      <span className="truncate">{alert.source}</span>
      <span aria-hidden>·</span>
      <span className="whitespace-nowrap">{t('common.minutesAgo', { count: alert.minutesAgo })}</span>
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

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {(['all', ...ALERT_LEVELS.slice().reverse()] as LevelFilter[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={level === option}
            onClick={() => setLevel(option)}
            className={cn(
              'min-h-9 rounded-full border px-3.5 text-xs font-semibold transition',
              level === option ? 'border-cobalt bg-cobalt text-white' : 'border-line bg-surface text-ink-muted hover:text-ink',
            )}
          >
            {option === 'all' ? t('veille.all') : t(`alertLevel.${option}`)}
          </button>
        ))}
        <Button variant="secondary" className="ml-auto hidden lg:inline-flex">
          <Megaphone className="size-4" aria-hidden />
          {t('veille.reportRumor')}
        </Button>
      </div>

      <SectionTitle>
        <span className="inline-flex items-center gap-2">
          <Radio className="size-4 text-danger" aria-hidden />
          {t('veille.realtime')}
        </span>
      </SectionTitle>

      {!featured && <p className="py-10 text-center text-sm text-ink-muted">{t('common.noResult')}</p>}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {featured && (
          <Card className="overflow-hidden lg:col-span-2 lg:row-span-2">
            <div className="relative flex h-44 items-center justify-center bg-gradient-to-br from-navy to-cobalt lg:h-64">
              <CloudRain className="size-16 text-white/35" aria-hidden />
              {featured.level === 'high' && (
                <Badge tone="danger" solid className="absolute left-3 top-3">
                  {t('veille.urgent')}
                </Badge>
              )}
            </div>
            <div className="space-y-3 p-4">
              <h3 className="font-display text-base font-bold leading-snug text-ink lg:text-lg">{featured.title}</h3>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <AlertMeta alert={featured} />
                <Button className="min-h-9 text-xs">{t('veille.takeCharge')}</Button>
              </div>
            </div>
          </Card>
        )}
        {others.map((alert) => (
          <Card key={alert.id} className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-ink-muted">{alert.region}</span>
              <AlertLevelBadge level={alert.level} />
            </div>
            <h3 className="text-sm font-semibold leading-snug text-ink">{alert.title}</h3>
            <AlertMeta alert={alert} />
          </Card>
        ))}
      </div>
      <DemoNotice module="MOD-07" />
    </>
  )
}
