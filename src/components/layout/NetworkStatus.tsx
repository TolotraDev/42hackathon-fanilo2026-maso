import { CloudOff, Wifi } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'

/** Pastille en ligne / hors ligne (icône + texte, jamais la couleur seule). */
export function NetworkStatus({ className }: { className?: string }) {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  const Icon = online ? Wifi : CloudOff
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', className)} role="status">
      <Icon className="size-4" aria-hidden />
      {online ? t('network.online') : t('network.offline')}
    </span>
  )
}

export function OfflineBanner() {
  const { t } = useTranslation()
  const online = useOnlineStatus()
  if (online) return null
  return (
    <div role="alert" className="flex items-center gap-2 bg-warning px-4 py-2 text-xs font-semibold text-navy">
      <CloudOff className="size-4 shrink-0" aria-hidden />
      {t('network.offlineBanner')}
    </div>
  )
}
