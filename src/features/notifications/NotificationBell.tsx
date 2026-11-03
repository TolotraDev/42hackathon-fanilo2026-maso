import { Bell } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useCaseStore } from '@/features/dossiers/CaseStoreProvider'
import { cn } from '@/lib/cn'
import { deviceNotificationsOn } from './deviceNotifications'

/** Cloche de l'en-tête : nombre de notifications non lues (équipe éditoriale uniquement). */
export function NotificationBell({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t } = useTranslation()
  const { store, notifications } = useCaseStore()
  const unread = notifications.filter((item) => !item.readAt).length
  const previous = useRef(unread)

  // Notification sur l'appareil (M14) quand une nouvelle notification arrive pendant que MASO est en arrière-plan.
  useEffect(() => {
    if (unread > previous.current && document.hidden && deviceNotificationsOn()) {
      new Notification('MASO', { body: t('notifications.unread', { count: unread }), icon: '/pwa-192x192.png', tag: 'maso-notifications' })
    }
    previous.current = unread
  }, [unread, t])

  if (!store) return null
  return (
    <Link
      to="/notifications"
      aria-label={unread ? t('notifications.unread', { count: unread }) : t('notifications.title')}
      className={cn(
        'relative flex size-11 items-center justify-center rounded-full lg:size-10 lg:rounded-xl',
        tone === 'dark' ? 'hover:bg-white/10' : 'text-ink-muted hover:bg-line hover:text-ink',
      )}
    >
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold leading-4 text-white" aria-hidden>
          {unread > 9 ? '9+' : unread}
        </span>
      )}
    </Link>
  )
}
