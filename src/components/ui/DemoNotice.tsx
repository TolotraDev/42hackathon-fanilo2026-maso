import { FlaskConical } from 'lucide-react'
import { useTranslation } from 'react-i18next'

/** Signale que le contenu affiché est fictif, en attendant le module qui le branchera. */
export function DemoNotice({ module }: { module: string }) {
  const { t } = useTranslation()
  return (
    <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-xs text-ink-muted">
      <FlaskConical className="size-3.5" aria-hidden />
      {t('common.demoData')} · {t('common.comingWith', { module })}
    </p>
  )
}
