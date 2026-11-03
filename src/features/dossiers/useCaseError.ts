import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthFailure } from '@/features/auth/authService'
import { CaseRuleError } from './rules'

/** Message lisible pour une règle de dossier non respectée (avec le détail des blocages). */
export function useCaseErrorMessage() {
  const { t, i18n } = useTranslation()
  return useCallback(
    (error: unknown) => {
      if (error instanceof CaseRuleError) {
        const base = t(`dossiers.error.${error.code}`)
        return error.details.length ? `${base} ${error.details.map((detail) => t(`dossiers.blocker.${detail}`)).join(' · ')}` : base
      }
      // Refus métier du serveur (ex. publication_blocked) : même message que la règle appliquée sur l'appareil.
      const server = error as { serverCode?: string; details?: string }
      if (server?.serverCode && i18n.exists(`dossiers.error.${server.serverCode}`)) {
        const details = (server.details ?? '').split(',').filter((detail) => i18n.exists(`dossiers.blocker.${detail}`))
        return [t(`dossiers.error.${server.serverCode}`), ...details.map((detail) => t(`dossiers.blocker.${detail}`))].join(' ')
      }
      if (error instanceof AuthFailure) return t(`auth.error.${error.code}`)
      return t('auth.error.unknown')
    },
    [t, i18n],
  )
}
