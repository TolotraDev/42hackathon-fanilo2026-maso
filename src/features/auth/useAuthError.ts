import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AuthFailure } from './authService'

/** Traduit une erreur d'authentification en message lisible. */
export function useAuthErrorMessage() {
  const { t } = useTranslation()
  return useCallback((error: unknown) => t(`auth.error.${error instanceof AuthFailure ? error.code : 'unknown'}`), [t])
}
