import { CalendarClock, CloudOff, Columns3, Library, List, Plus } from 'lucide-react'
import { useDeferredValue, useMemo, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { useShellSearch } from '@/components/layout/AppShell'
import {
  Badge,
  Card,
  CaseStatusBadge,
  Input,
  ProgressBar,
  SegmentedControl,
} from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { cn } from '@/lib/cn'
import { matchesQuery } from '@/lib/text'
import { CASE_STATUSES, CASE_STATUS_TONES, type CaseStatus, type Tone } from '@/types/domain'
import { useCases, useCaseStore } from './CaseStoreProvider'
import type { CaseRecord } from './model'
import { SyncBadge } from './SyncBadge'

type View = 'list' | 'board'

const TONE_BORDERS: Record<Tone, string> = {
  neutral: 'border-l-ink-muted',
  info: 'border-l-cobalt',
  success: 'border-l-success',
  warning: 'border-l-warning',
  danger: 'border-l-danger',
}
const DONE: CaseStatus[] = ['validated', 'published', 'closed']
const SELECT =
  'min-h-10 rounded-xl border border-line bg-surface px-3 text-xs text-ink transition-colors duration-150 hover:border-cobalt/50 focus:border-cobalt focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/20'

const COUNTER_TONES = {
  cobalt: { bg: 'bg-cobalt/5', text: 'text-cobalt', border: 'border-t-cobalt' },
  warning: { bg: 'bg-warning/5', text: 'text-warning', border: 'border-t-warning' },
  success: { bg: 'bg-success/5', text: 'text-success', border: 'border-t-success' },
}

function CaseCard({ item, compact = false }: { item: CaseRecord; compact?: boolean }) {
  const { t, i18n } = useTranslation()
  const { syncStates, team } = useCaseStore()
  const navigate = useNavigate()
  const assignee = team.find((member) => member.id === item.assignedTo)?.fullName
  const overdue =
    item.dueDate &&
    !DONE.includes(item.status) &&
    item.dueDate < new Date().toISOString().slice(0, 10)

  return (
    <button
      type="button"
      onClick={() => navigate(`/dossiers/${item.id}`)}
      className="block w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded-xl"
    >
      <Card
        className={cn(
          'space-y-2.5 border-l-4 p-3.5 transition-all duration-200 hover:border-cobalt hover:shadow-sm',
          TONE_BORDERS[CASE_STATUS_TONES[item.status]],
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-semibold leading-snug text-ink">{item.title}</h3>
          {!compact && <CaseStatusBadge status={item.status} />}
        </div>
        {item.checklistTotal > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-[11px] text-ink-muted">
              <span>{t('dossiers.progress')}</span>
              <span>
                {item.checklistDone}/{item.checklistTotal}
              </span>
            </div>
            <ProgressBar
              value={item.checklistDone}
              max={item.checklistTotal}
              tone={CASE_STATUS_TONES[item.status]}
              label={t('dossiers.progress')}
            />
          </div>
        )}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-ink-muted">
          <Badge
            tone={
              item.priority === 1 ? 'danger' : item.priority === 2 ? 'warning' : 'neutral'
            }
          >
            {t(`dossiers.priority.${item.priority}`)}
          </Badge>
          {item.dueDate && (
            <span
              className={cn(
                'inline-flex items-center gap-1',
                overdue && 'font-semibold text-danger',
              )}
            >
              <CalendarClock className="size-3.5" aria-hidden />
              {t('dossiers.due', {
                date: new Intl.DateTimeFormat(i18n.resolvedLanguage, {
                  day: 'numeric',
                  month: 'short',
                }).format(new Date(`${item.dueDate}T00:00:00`)),
              })}
            </span>
          )}
          {assignee && <span>· {assignee}</span>}
          <span className="ml-auto">
            <SyncBadge state={syncStates[item.id] ?? 'synced'} />
          </span>
        </div>
      </Card>
    </button>
  )
}

/** M12 — Mes dossiers, et W4 — file de vérification en colonnes par statut (maquette « Tableau de bord »). */
export function DossiersPage() {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { pending } = useCaseStore()
  const { cases, offline } = useCases()
  const shellQuery = useShellSearch()
  const [view, setView] = useState<View>('list')
  const [tab, setTab] = useState<'active' | 'done'>('active')
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ status: '', priority: '', mine: false })

  const deferredQuery = useDeferredValue(query)

  const filtered = useMemo(
    () =>
      (cases ?? []).filter(
        (item) =>
          matchesQuery(
            deferredQuery,
            item.title,
            item.claim,
            item.category ?? '',
            item.region ?? '',
          ) &&
          matchesQuery(
            shellQuery,
            item.title,
            item.claim,
            item.category ?? '',
            item.region ?? '',
          ) &&
          (!filters.status || item.status === filters.status) &&
          (!filters.priority || String(item.priority) === filters.priority) &&
          (!filters.mine ||
            item.assignedTo === profile?.id ||
            item.createdBy === profile?.id),
      ),
    [cases, deferredQuery, shellQuery, filters, profile?.id],
  )
  const listed = filtered.filter((item) => DONE.includes(item.status) === (tab === 'done'))

  const counters: Array<{
    key: 'inProgress' | 'toReview' | 'published'
    label: string
    value: number
    tone: keyof typeof COUNTER_TONES
  }> = [
    {
      key: 'inProgress',
      label: t('dossiers.countInProgress'),
      value: (cases ?? []).filter((c) =>
        ['new', 'in_analysis', 'awaiting_response', 'correction_requested'].includes(c.status),
      ).length,
      tone: 'cobalt',
    },
    {
      key: 'toReview',
      label: t('dossiers.countToReview'),
      value: (cases ?? []).filter((c) => c.status === 'to_review').length,
      tone: 'warning',
    },
    {
      key: 'published',
      label: t('dossiers.countPublished'),
      value: (cases ?? []).filter((c) => c.status === 'published').length,
      tone: 'success',
    },
  ]

  return (
    <div className="space-y-4">
      {/* Compteurs colorés */}
      <div className="grid grid-cols-3 gap-2">
        {counters.map((counter, index) => {
          const tone = COUNTER_TONES[counter.tone]
          return (
            <Card
              key={counter.key}
              className={cn(
                'dashboard-rise border-t-4 px-3 py-3 text-center shadow-sm',
                tone.bg,
                tone.border,
              )}
              style={{ '--i': index } as CSSProperties}
            >
              <p className={cn('font-display text-2xl font-extrabold', tone.text)}>
                {counter.value}
              </p>
              <p className="text-xs text-ink-muted">{counter.label}</p>
            </Card>
          )
        })}
      </div>

      {/* Bannière hors-ligne */}
      {(offline || pending > 0) && (
        <p
          role="status"
          className="dashboard-fade flex items-center gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning dark:text-warning/90"
        >
          <CloudOff className="size-4 shrink-0" aria-hidden />
          {offline ? t('dossiers.offlineList') : ''}{' '}
          {pending > 0 ? t('dossiers.pendingChanges', { count: pending }) : ''}
        </p>
      )}

      {/* Barre d'actions */}
      <div className="dashboard-rise flex flex-wrap items-center gap-2" style={{ '--i': 3 } as CSSProperties}>
        <Link
          to="/dossiers/nouveau"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-cobalt px-4 text-sm font-semibold text-white shadow-sm transition-all hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
        >
          <Plus className="size-4" aria-hidden />
          {t('dossiers.new')}
        </Link>
        <Link
          to="/dossiers/bibliotheque"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-semibold text-cobalt transition-colors hover:bg-cobalt/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
        >
          <Library className="size-4" aria-hidden />
          {t('bibliotheque.title')}
        </Link>

        <div
          role="group"
          aria-label={t('dossiers.view')}
          className="ml-auto flex rounded-xl border border-line bg-surface p-1"
        >
          {(
            [
              ['list', List],
              ['board', Columns3],
            ] as const
          ).map(([value, Icon]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              onClick={() => setView(value)}
              className={cn(
                'flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt',
                view === value
                  ? 'bg-cobalt text-white shadow-sm'
                  : 'text-ink-muted hover:text-cobalt',
              )}
            >
              <Icon className="size-4" aria-hidden />
              {t(`dossiers.views.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Filtres */}
      <Card
        className="dashboard-rise grid grid-cols-2 gap-2 border-t-4 border-t-white/20 p-3 shadow-sm sm:grid-cols-4"
        style={{ '--i': 4 } as CSSProperties}
      >
        <Input
          type="search"
          className="col-span-2 sm:col-span-1 bg-canvas/50"
          aria-label={t('common.searchPlaceholder')}
          placeholder={t('common.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label={t('dossiers.field.status')}
          className={SELECT}
          value={filters.status}
          onChange={(event) => setFilters({ ...filters, status: event.target.value })}
        >
          <option value="">{t('dossiers.field.status')}</option>
          {CASE_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t(`caseStatus.${status}`)}
            </option>
          ))}
        </select>
        <select
          aria-label={t('dossiers.field.priority')}
          className={SELECT}
          value={filters.priority}
          onChange={(event) => setFilters({ ...filters, priority: event.target.value })}
        >
          <option value="">{t('dossiers.field.priority')}</option>
          {[1, 2, 3].map((priority) => (
            <option key={priority} value={priority}>
              {t(`dossiers.priority.${priority}`)}
            </option>
          ))}
        </select>
        <label className="flex min-h-10 cursor-pointer items-center gap-2 text-xs font-semibold text-ink transition-colors hover:text-cobalt">
          <input
            type="checkbox"
            className="size-4 accent-cobalt focus-visible:ring-2 focus-visible:ring-cobalt/40"
            checked={filters.mine}
            onChange={(event) => setFilters({ ...filters, mine: event.target.checked })}
          />
          {t('dossiers.mine')}
        </label>
      </Card>

      {/* Skeleton */}
      {cases === null && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={`skeleton-${i}`} className="space-y-2.5 p-3.5">
              <div className="h-4 w-2/3 animate-pulse rounded bg-line" />
              <div className="h-3 w-full animate-pulse rounded bg-line" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
            </Card>
          ))}
        </div>
      )}

      {/* Vue liste */}
      {cases !== null && view === 'list' && (
        <>
          <SegmentedControl
            label={t('nav.dossiers')}
            value={tab}
            onChange={setTab}
            options={[
              { value: 'active', label: t('dossiers.tabActive') },
              { value: 'done', label: t('dossiers.tabDone') },
            ]}
            className="lg:max-w-sm"
          />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {listed.map((item, index) => (
              <div
                key={item.id}
                className="dashboard-rise"
                style={{ '--i': Math.min(index + 5, 12) } as CSSProperties}
              >
                <CaseCard item={item} />
              </div>
            ))}
          </div>
          {listed.length === 0 && (
            <p className="dashboard-fade py-10 text-center text-sm text-ink-muted">
              {t('common.noResult')}
            </p>
          )}
        </>
      )}

      {/* Vue tableau */}
      {cases !== null && view === 'board' && (
        <div className="custom-scrollbar -mx-4 overflow-x-auto px-4 pb-4 pt-2 lg:mx-0 lg:px-0">
          <div className="flex gap-3" style={{ minWidth: `${CASE_STATUSES.length * 16.5}rem` }}>
            {CASE_STATUSES.map((status) => {
              const column = filtered.filter((item) => item.status === status)
              const tone = CASE_STATUS_TONES[status]
              return (
                <section
                  key={status}
                  aria-label={t(`caseStatus.${status}`)}
                  className="dashboard-fade w-64 shrink-0 space-y-2 rounded-2xl bg-line/40 p-2"
                >
                  <h3 className="flex items-center justify-between px-1 pt-1 text-xs font-bold text-ink">
                    <span className="inline-flex items-center gap-1.5">
                      <span
                        className={cn(
                          'size-2 rounded-full',
                          tone === 'danger'
                            ? 'bg-danger'
                            : tone === 'warning'
                              ? 'bg-warning'
                              : tone === 'success'
                                ? 'bg-success'
                                : tone === 'info'
                                  ? 'bg-cobalt'
                                  : 'bg-ink-muted',
                        )}
                      />
                      {t(`caseStatus.${status}`)}
                    </span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-ink-muted">
                      {column.length}
                    </span>
                  </h3>
                  {column.map((item) => (
                    <CaseCard key={item.id} item={item} compact />
                  ))}
                  {column.length === 0 && (
                    <p className="px-2 py-3 text-center text-[11px] text-ink-muted/70">
                      —
                    </p>
                  )}
                </section>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}