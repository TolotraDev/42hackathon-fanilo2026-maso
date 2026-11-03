import { Bell, FolderPlus, Globe, ImageUp, Library, Megaphone } from 'lucide-react'
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

  const shortcuts = [
    { to: '/dossiers/nouveau', icon: FolderPlus, key: 'newCase' },
    { to: '/verifier/image', icon: ImageUp, key: 'checkImage' },
    { to: '/dossiers/bibliotheque', icon: Library, key: 'library' },
    { to: '/portail', icon: Globe, key: 'portal' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <p className="font-display text-lg font-bold text-navy dark:text-ink">{t('accueil.hello', { name: profile?.fullName || profile?.email || '' })}</p>
        <p className="text-sm text-ink-muted">{t(`accueil.intro.${role === 'editor_in_chief' || role === 'fact_checker' ? role : 'journalist'}`)}</p>
      </div>

      <section aria-label={t('accueil.indicators')} className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicators.map((indicator) => (
          <Card key={indicator.key} className="p-4">
            <p className="font-display text-3xl font-extrabold text-navy dark:text-ink">{cases ? indicator.value : '…'}</p>
            <Badge tone={indicator.tone} className="mt-1 whitespace-normal">{t(`accueil.indicator.${indicator.key}`)}</Badge>
          </Card>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <SectionTitle>{t('accueil.queue')}</SectionTitle>
            {queue.length === 0 && <p className="text-sm text-ink-muted">{t('accueil.queueEmpty')}</p>}
            <ul className="divide-y divide-line">
              {queue.slice(0, 8).map((item) => (
                <li key={item.id}>
                  <Link to={caseLink(item)} className="flex min-h-12 items-center gap-3 py-2 hover:text-cobalt">
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{item.title}</span>
                    {item.dueDate && item.dueDate < today() && <Badge tone="danger">{t('accueil.late')}</Badge>}
                    <CaseStatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4" id="signalements">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <Megaphone className="size-4 text-cobalt" aria-hidden />
                {t('accueil.publicAlerts')}
              </span>
            </SectionTitle>
            {alerts.error ? <p className="text-sm text-ink-muted">{t('accueil.alertsUnavailable')}</p> : null}
            {alerts.data?.length === 0 && <p className="text-sm text-ink-muted">{t('accueil.noAlerts')}</p>}
            <ul className="divide-y divide-line">
              {alerts.data?.map((alert) => (
                <li key={alert.id} className="space-y-1 py-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Badge tone={alert.status === 'new' ? 'warning' : 'info'}>{t(`portail.track.status.${alert.status}`)}</Badge>
                    {alert.occurrences > 1 && <Badge>{t('accueil.occurrences', { count: alert.occurrences })}</Badge>}
                    {alert.hasFile && <Badge tone="info">{t('accueil.withFile')}</Badge>}
                    <span className="text-[11px] text-ink-muted">{formatDate(alert.createdAt)} · {alert.trackingCode}</span>
                  </div>
                  <p className="line-clamp-2 text-sm text-ink [overflow-wrap:anywhere]">{alert.text ?? alert.url ?? t('accueil.fileOnly')}</p>
                  {alert.status === 'new' && (
                    <Link to={`/dossiers/nouveau?alerte=${alert.id}`} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
                      <FolderPlus className="size-4" aria-hidden />
                      {t('accueil.takeAlert')}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-4">
            <SectionTitle>{t('accueil.recent')}</SectionTitle>
            <ul className="divide-y divide-line">
              {recent.map((item) => (
                <li key={item.id}>
                  <Link to={`/dossiers/${item.id}`} className="flex min-h-12 items-center gap-3 py-2 hover:text-cobalt">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{item.title}</span>
                      <span className="block text-[11px] text-ink-muted">{formatDate(item.updatedAt)}</span>
                    </span>
                    <CaseStatusBadge status={item.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <SectionTitle action={<Link to="/notifications" className="text-xs font-semibold text-cobalt hover:underline">{t('accueil.seeAll')}</Link>}>
              <span className="flex items-center gap-2">
                <Bell className="size-4 text-cobalt" aria-hidden />
                {t('notifications.title')}
              </span>
            </SectionTitle>
            {notifications.length === 0 && <p className="text-sm text-ink-muted">{t('notifications.none')}</p>}
            <ul className="space-y-2">
              {notifications.slice(0, 5).map((item) => (
                <li key={item.id}>
                  <Link to={notificationLink(item)} className="block text-sm hover:text-cobalt">
                    <span className={item.readAt ? 'text-ink-muted' : 'font-semibold text-ink'}>{t(`notifications.kind.${item.kind}`, { name: names(item.actorId) })}</span>
                    {item.body && <span className="block truncate text-xs text-ink-muted">{item.body}</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <SectionTitle>{t('accueil.shortcuts')}</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {shortcuts.map(({ to, icon: Icon, key }) => (
                <Link key={key} to={to} className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl border border-line p-2 text-center text-xs font-semibold text-ink hover:border-cobalt hover:text-cobalt">
                  <Icon className="size-5 text-cobalt" aria-hidden />
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
