import { CloudCheck, CloudUpload, TriangleAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui'
import type { SyncState } from './model'

/** État de synchronisation d'un dossier, toujours écrit (section 12 : état visible de chaque donnée). */
export function SyncBadge({ state }: { state: SyncState }) {
  const { t } = useTranslation()
  const Icon = state === 'synced' ? CloudCheck : state === 'pending' ? CloudUpload : TriangleAlert
  return (
    <Badge tone={state === 'synced' ? 'neutral' : state === 'pending' ? 'warning' : 'danger'}>
      <Icon className="size-3.5" aria-hidden />
      {t(`dossiers.sync.${state}`)}
    </Badge>
  )
}
