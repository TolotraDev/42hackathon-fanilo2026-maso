import { Bell, FolderPlus, Globe, ImageUp, Library, Megaphone, ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Card, CaseStatusBadge, SectionTitle } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { useCases, useCaseStore } from '@/features/dossiers/CaseStoreProvider'
import type { CaseRecord } from '@/features/dossiers/model'
import { notificationLink } from '@/features/notifications/NotificationsPage'
import { useLoad } from '@/features/portail/useLoad'
import type { Role, Tone } from '@/types/domain'
import { alertsApi } from './alertsApi'

const CLOSED = ['published', 'closed']
const today = () => new Date().toISOString().slice(0, 10)

const TONE_BAR: Record<Tone, string> = {
  info: 'bg-cobalt',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  neutral: 'bg-slate-400',
}

interface Indicator {
  key: string
  value: number
  tone: Tone
}

/** Indicateurs et file de travail selon le rôle (W2). Calculés sur les dossiers de l'appareil : disponibles hors ligne. */
export function roleView(cases: CaseRecord[], role: Role | null, userId: string | null): { indicators: Indicator[]; queue: CaseRecord[] } {
  const mine = (item: CaseRecord) => item.createdBy === userId || item.assignedTo === userId
  const open = cases.filter((item) => !CLOSED.includes(item.status))
  const late = open.filter((item) => item.dueDate && item.dueDate < today())
  const published = cases.filter((item) => item.status === 'published')
  if (role === 'editor_in_chief') {
    const toReview = cases.filter((item) => item.status === 'to_review')
    const validated = cases.filter((item) => item.status === 'validated')
    return {
      indicators: [
        { key: 'toReview', value: toReview.length, tone: 'warning' },
        { key: 'toPublish', value: validated.length, tone: 'success' },
        { key: 'open', value: open.length, tone: 'info' },
        { key: 'late', value: late.length, tone: 'danger' },
      ],
      queue: [...toReview, ...validated, ...late.filter((item) => !['to_review', 'validated'].includes(item.status))],
    }
  }
  if (role === 'fact_checker') {
    const assigned = open.filter((item) => item.assignedTo === userId)
    const corrections = open.filter((item) => item.status === 'correction_requested')
    return {
      indicators: [
        { key: 'assigned', value: assigned.length, tone: 'info' },
        { key: 'inAnalysis', value: open.filter((item) => item.status === 'in_analysis').length, tone: 'info' },
        { key: 'corrections', value: corrections.length, tone: 'danger' },
        { key: 'published', value: published.length, tone: 'success' },
      ],
      queue: [...corrections, ...assigned.filter((item) => item.status !== 'correction_requested')],
    }
  }
  const myOpen = open.filter(mine)
  return {
    indicators: [
      { key: 'myOpen', value: myOpen.length, tone: 'info' },
      { key: 'corrections', value: myOpen.filter((item) => item.status === 'correction_requested').length, tone: 'danger' },
      { key: 'late', value: late.filter(mine).length, tone: 'warning' },
      { key: 'published', value: published.length, tone: 'success' },
    ],
    queue: myOpen,
  }
}

/** W2 — Tableau de bord : indicateurs, file de travail, notifications, signalements du public, raccourcis. */
export function DashboardPage() {
  const { t, i18n } = useTranslation()
  const { role, profile } = useAuth()
  const { cases } = useCases()
  const { notifications, version, team } = useCaseStore()
  const names = (id: string | null) => team.find((member) => member.id === id)?.fullName ?? t('notifications.someone')
  const alerts = useLoad(() => alertsApi().list(), [version])
  const { indicators, queue } = roleView(cases ?? [], role, profile?.id ?? null)
  const recent = (cases ?? []).slice(0, 5)
  const formatDate = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  const caseLink = (item: CaseRecord) => (role === 'editor_in_chief' && ['to_review', 'validated'].includes(item.status) ? `/dossiers/${item.id}/revue` : `/dossiers/${item.id}`)
  const displayName = profile?.fullName || profile?.email || ''
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')

  const shortcuts = [
    { to: '/dossiers/nouveau', icon: FolderPlus, key: 'newCase' },
    { to: '/verifier/image', icon: ImageUp, key: 'checkImage' },
    { to: '/dossiers/bibliotheque', icon: Library, key: 'library' },
    { to: '/portail', icon: Globe, key: 'portal' },
  ]

  return (
    <div className="space-y-6">
      {/* En-tête */}
      <header className="dashboard-fade flex items-center gap-4">
        <div
          aria-hidden
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-navy font-display text-lg font-bold text-white shadow-sm dark:bg-cobalt"
        >
          {initials || '·'}
        </div>
        <div className="min-w-0">
          <p className="truncate font-display text-xl font-bold text-navy dark:text-ink">
            {t('accueil.hello', { name: displayName })}
          </p>
          <p className="text-sm text-ink-muted">
            {t(`accueil.intro.${role === 'editor_in_chief' || role === 'fact_checker' ? role : 'journalist'}`)}
          </p>
        </div>
      </header>

      {/* Indicateurs */}
      <section aria-label={t('accueil.indicators')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicators.map((indicator, index) => (
          <Card
            key={indicator.key}
            className="indicator-card dashboard-rise group relative overflow-hidden p-4 transition-shadow hover:shadow-md"
            style={{ ['--i' as string]: index }}
          >
            <span
              aria-hidden
              className={`tone-bar absolute inset-y-0 left-0 w-1 ${TONE_BAR[indicator.tone]}`}
            />
            <p className="font-display text-3xl font-extrabold leading-none text-navy dark:text-ink">
              {cases ? indicator.value : '…'}
            </p>
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-ink-muted">
              {t(`accueil.indicator.${indicator.key}`)}
            </p>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 space-y-4">
          {/* File de travail */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <SectionTitle>{t('accueil.queue')}</SectionTitle>
            </div>
            {queue.length === 0 && <p className="px-4 py-6 text-sm text-ink-muted">{t('accueil.queueEmpty')}</p>}
            <ul className="divide-y divide-line">
              {queue.slice(0, 8).map((item, index) => {
                const isLate = item.dueDate && item.dueDate < today()
                return (
                  <li key={item.id} className="dashboard-rise" style={{ ['--i' as string]: index }}>
                    <Link
                      to={caseLink(item)}
                      className="row-link flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle hover:text-cobalt"
                    >
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.title}</span>
                      {isLate && <Badge tone="danger">{t('accueil.late')}</Badge>}
                      <CaseStatusBadge status={item.status} />
                      <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
                    </Link>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* Signalements du public */}
          <Card className="overflow-hidden" id="signalements">
            <div className="border-b border-line px-4 py-3">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Megaphone className="size-4 text-cobalt" aria-hidden />
                  {t('accueil.publicAlerts')}
                </span>
              </SectionTitle>
            </div>
            <div className="space-y-2 p-3">
              {alerts.error ? <p className="px-1 text-sm text-ink-muted">{t('accueil.alertsUnavailable')}</p> : null}
              {alerts.data?.length === 0 && <p className="px-1 text-sm text-ink-muted">{t('accueil.noAlerts')}</p>}
              <ul className="space-y-2">
                {alerts.data?.map((alert, index) => (
                  <li
                    key={alert.id}
                    className="dashboard-rise rounded-xl border border-line bg-surface-subtle/40 p-3 transition-colors hover:border-cobalt/40"
                    style={{ ['--i' as string]: index }}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge tone={alert.status === 'new' ? 'warning' : 'info'}>
                        {t(`portail.track.status.${alert.status}`)}
                      </Badge>
                      {alert.occurrences > 1 && <Badge>{t('accueil.occurrences', { count: alert.occurrences })}</Badge>}
                      {alert.hasFile && <Badge tone="info">{t('accueil.withFile')}</Badge>}
                      <span className="ml-auto text-[11px] text-ink-muted">
                        {formatDate(alert.createdAt)} · {alert.trackingCode}
                      </span>
                    </div>
                    <p className="mt-1.5 line-clamp-2 text-sm text-ink [overflow-wrap:anywhere]">
                      {alert.text ?? alert.url ?? t('accueil.fileOnly')}
                    </p>
                    {alert.status === 'new' && (
                      <Link
                        to={`/dossiers/nouveau?alerte=${alert.id}`}
                        className="mt-2 inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline"
                      >
                        <FolderPlus className="size-4" aria-hidden />
                        {t('accueil.takeAlert')}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          {/* Dossiers récents */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-4 py-3">
              <SectionTitle>{t('accueil.recent')}</SectionTitle>
            </div>
            <ul className="divide-y divide-line">
              {recent.map((item, index) => (
                <li key={item.id} className="dashboard-fade" style={{ ['--i' as string]: index }}>
                  <Link
                    to={`/dossiers/${item.id}`}
                    className="row-link flex min-h-12 items-center gap-3 px-4 py-3 transition-colors hover:bg-surface-subtle hover:text-cobalt"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{item.title}</span>
                      <span className="block text-[11px] text-ink-muted">{formatDate(item.updatedAt)}</span>
                    </span>
                    <CaseStatusBadge status={item.status} />
                    <ArrowRight className="row-arrow size-4 shrink-0 text-ink-muted" aria-hidden />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* Colonne latérale */}
        <aside className="space-y-4">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <SectionTitle>
                <span className="flex items-center gap-2">
                  <Bell className="size-4 text-cobalt" aria-hidden />
                  {t('notifications.title')}
                </span>
              </SectionTitle>
              <Link
                to="/notifications"
                className="inline-flex items-center gap-1 text-xs font-semibold text-cobalt hover:underline"
              >
                {t('accueil.seeAll')}
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
            <div className="p-3">
              {notifications.length === 0 && <p className="px-1 text-sm text-ink-muted">{t('notifications.none')}</p>}
              <ul className="space-y-1">
                {notifications.slice(0, 5).map((item, index) => (
                  <li key={item.id} className="dashboard-fade" style={{ ['--i' as string]: index }}>
                    <Link
                      to={notificationLink(item)}
                      className="flex gap-2 rounded-lg px-2 py-2 text-sm transition-colors hover:bg-surface-subtle hover:text-cobalt"
                    >
                      <span
                        aria-hidden
                        className={`mt-1.5 size-2 shrink-0 rounded-full ${
                          item.readAt ? 'bg-transparent' : 'notif-dot-unread bg-cobalt'
                        }`}
                      />
                      <span className="min-w-0">
                        <span className={item.readAt ? 'text-ink-muted' : 'font-semibold text-ink'}>
                          {t(`notifications.kind.${item.kind}`, { name: names(item.actorId) })}
                        </span>
                        {item.body && <span className="block truncate text-xs text-ink-muted">{item.body}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>{t('accueil.shortcuts')}</SectionTitle>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {shortcuts.map(({ to, icon: Icon, key }, index) => (
                <Link
                  key={key}
                  to={to}
                  className="shortcut-link dashboard-rise flex min-h-20 flex-col items-center justify-center gap-2 rounded-xl border border-line p-2 text-center text-xs font-semibold text-ink transition-colors hover:border-cobalt hover:bg-cobalt/5 hover:text-cobalt"
                  style={{ ['--i' as string]: index }}
                >
                  <span className="shortcut-icon flex size-9 items-center justify-center rounded-full bg-cobalt/10 text-cobalt">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  {t(`accueil.shortcut.${key}`)}
                </Link>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </div>
  )
}