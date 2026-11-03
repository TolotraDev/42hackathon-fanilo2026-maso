import { AtSign, Bell, CheckCheck, CircleCheck, FilePen, Gavel, Megaphone, RotateCcw, Search, UserPlus, ScanSearch, XCircle, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Card } from '@/components/ui'
import { useCaseStore } from '@/features/dossiers/CaseStoreProvider'
import { cn } from '@/lib/cn'
import type { AppNotification, NotificationKind } from './notifications'

const ICONS: Record<NotificationKind, LucideIcon> = {
  assigned: UserPlus,
  analysis_submitted: ScanSearch,
  review_requested: Gavel,
  correction_requested: FilePen,
  verification_requested: Search,
  rejected: XCircle,
  validated: CircleCheck,
  published: CircleCheck,
  mentioned: AtSign,
  public_report: Megaphone,
}

export const notificationLink = (item: AppNotification) =>
  item.caseId ? (item.kind === 'review_requested' ? `/dossiers/${item.caseId}/revue` : `/dossiers/${item.caseId}`) : '/accueil#signalements'

/** Notifications de l'utilisateur (section 12). */
export function NotificationsPage() {
  const { t, i18n } = useTranslation()
  const { notifications, team, markRead, refreshNotifications } = useCaseStore()
  const unread = notifications.filter((item) => !item.readAt)
  const names = (id: string | null) => team.find((member) => member.id === id)?.fullName ?? t('notifications.someone')
  const formatDate = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))

  useEffect(() => {
    void refreshNotifications()
  }, [refreshNotifications])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ink-muted">{unread.length ? t('notifications.unread', { count: unread.length }) : t('notifications.allRead')}</p>
        {unread.length > 0 && (
          <Button variant="secondary" className="min-h-10 text-xs" onClick={() => void markRead(unread.map((item) => item.id))}>
            <CheckCheck className="size-4" aria-hidden />
            {t('notifications.markAll')}
          </Button>
        )}
      </div>
      {notifications.length === 0 && (
        <Card className="flex items-center gap-3 p-4 text-sm text-ink-muted">
          <Bell className="size-5" aria-hidden />
          {t('notifications.none')}
        </Card>
      )}
      <ul className="space-y-2">
        {notifications.map((item) => {
          const Icon = ICONS[item.kind] ?? RotateCcw
          return (
            <li key={item.id}>
              <Link to={notificationLink(item)} onClick={() => void markRead([item.id])} className="block rounded-2xl">
                <Card className={cn('flex items-start gap-3 p-3 transition hover:border-cobalt', !item.readAt && 'border-cobalt/50 bg-cobalt/5')}>
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-cobalt/10 text-cobalt">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink">{t(`notifications.kind.${item.kind}`, { name: names(item.actorId) })}</span>
                    {item.body && <span className="block truncate text-sm text-ink-muted">{item.body}</span>}
                    <span className="block text-[11px] text-ink-muted">{formatDate(item.createdAt)}{!item.readAt && ` · ${t('notifications.new')}`}</span>
                  </span>
                </Card>
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
