import { CloudOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { PackState } from './useResources'

/** Indique qu'on consulte la version enregistrée sur l'appareil, et sa date. */
export function PackNotice({ pack }: { pack: PackState }) {
  const { t, i18n } = useTranslation()
  if (!pack.offline || !pack.savedAt) return null
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(pack.savedAt))
  return (
    <p role="status" className="flex items-center gap-2 rounded-xl bg-warning/20 px-3 py-2 text-xs text-ink">
      <CloudOff className="size-4 shrink-0" aria-hidden />
      {t('ressources.offlinePack', { date })}
    </p>
  )
}
