import { CircleCheck, Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { useInstallPrompt } from '@/hooks/useInstallPrompt'
import { installPlatform } from '@/lib/installPrompt'

type Outcome = 'accepted' | 'dismissed' | 'unavailable' | null

/**
 * Bouton « Installer l'application », toujours cliquable :
 * - le navigateur sait installer (Chrome, Edge, Samsung Internet…) : sa fenêtre d'installation s'ouvre ;
 * - sinon (iPhone, Firefox, navigateur de Facebook…) : la marche à suivre pour cet appareil s'affiche.
 */
export function InstallApp({ variant = 'primary', block = false }: { variant?: 'primary' | 'secondary'; block?: boolean }) {
  const { t } = useTranslation()
  const { canInstall, installed, install } = useInstallPrompt()
  const [outcome, setOutcome] = useState<Outcome>(null)
  const platform = installPlatform()

  if (outcome === 'accepted') return <p className="text-sm text-success" role="status">{t('install.accepted')}</p>
  if (installed) {
    return (
      <p className="flex items-center gap-2 text-sm text-success" role="status">
        <CircleCheck className="size-4 shrink-0" aria-hidden />
        {t('install.installed')}
      </p>
    )
  }

  return (
    <div className="space-y-2 text-left">
      <Button variant={variant} block={block} onClick={async () => setOutcome(canInstall ? await install() : 'unavailable')}>
        <Download className="size-4" aria-hidden />
        {t('install.button')}
      </Button>
      {outcome === 'dismissed' && <p className="text-sm text-ink-muted" role="status">{t('install.dismissed')}</p>}
      {outcome === 'unavailable' && (
        <div className="space-y-1 rounded-xl bg-canvas p-3 text-sm text-ink" role="region" aria-live="polite" aria-label={t('install.howTitle')}>
          <p className="font-semibold">{t('install.howTitle')}</p>
          <p className="whitespace-pre-line">{t(`install.how.${platform}`)}</p>
        </div>
      )}
    </div>
  )
}
