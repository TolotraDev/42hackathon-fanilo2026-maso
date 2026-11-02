import { CalendarClock } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellSearch } from '@/components/layout/AppShell'
import { Card, CaseStatusBadge, DemoNotice, ProgressBar, SegmentedControl } from '@/components/ui'
import { DEMO_CASES, isCaseDone } from '@/data/demo/cases'
import { matchesQuery } from '@/lib/text'
import { cn } from '@/lib/cn'
import { CASE_STATUS_TONES, type Tone } from '@/types/domain'

type Tab = 'active' | 'done'

const TONE_BORDERS: Record<Tone, string> = {
  neutral: 'border-l-ink-muted',
  info: 'border-l-cobalt',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
}

/** M12 / W2 — Mes dossiers (maquette « Tableau de bord »). */
export function DossiersPage() {
  const { t, i18n } = useTranslation()
  const query = useShellSearch()
  const [tab, setTab] = useState<Tab>('active')

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { day: 'numeric', month: 'short' }).format(new Date(`${iso}T00:00:00`))

  const counters = [
    { label: t('dossiers.countInProgress'), value: DEMO_CASES.filter((c) => ['in_analysis', 'awaiting_response', 'correction_requested'].includes(c.status)).length },
    { label: t('dossiers.countToReview'), value: DEMO_CASES.filter((c) => c.status === 'to_review').length },
    { label: t('dossiers.countPublished'), value: DEMO_CASES.filter((c) => c.status === 'published').length },
  ]

  const cases = DEMO_CASES.filter((c) => isCaseDone(c.status) === (tab === 'done') && matchesQuery(query, c.title))

  return (
    <>
      <div className="mb-4 grid grid-cols-3 gap-2">
        {counters.map((counter) => (
          <Card key={counter.label} className="px-3 py-3 text-center">
            <p className="font-display text-2xl font-extrabold text-navy dark:text-ink">{counter.value}</p>
            <p className="text-xs text-ink-muted">{counter.label}</p>
          </Card>
        ))}
      </div>

      <SegmentedControl
        label={t('nav.dossiers')}
        value={tab}
        onChange={setTab}
        options={[
          { value: 'active', label: t('dossiers.tabActive') },
          { value: 'done', label: t('dossiers.tabDone') },
        ]}
        className="mb-4 lg:max-w-sm"
      />

      {cases.length === 0 && <p className="py-10 text-center text-sm text-ink-muted">{t('common.noResult')}</p>}

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cases.map((item) => (
          <Card key={item.id} className={cn('space-y-3 border-l-4 p-4', TONE_BORDERS[CASE_STATUS_TONES[item.status]])}>
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug text-ink">{item.title}</h3>
              <CaseStatusBadge status={item.status} />
            </div>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-ink-muted">
                <span>{t('dossiers.progress')}</span>
                <span>
                  {item.checklistDone}/{item.checklistTotal}
                </span>
              </div>
              <ProgressBar value={item.checklistDone} max={item.checklistTotal} tone={CASE_STATUS_TONES[item.status]} label={t('dossiers.progress')} />
            </div>
            <p className="flex items-center gap-1.5 text-xs text-ink-muted">
              <CalendarClock className="size-3.5" aria-hidden />
              {t('dossiers.due', { date: formatDate(item.dueDate) })}
            </p>
          </Card>
        ))}
      </div>
      <DemoNotice module="MOD-05" />
    </>
  )
}

