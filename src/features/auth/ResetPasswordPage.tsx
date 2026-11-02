import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { homePathFor } from '@/lib/permissions'
import { useAuth } from './AuthProvider'
import { AuthLayout } from './AuthLayout'
import { FormMessage } from './FormMessage'
import { SplashScreen } from './RouteGuards'
import { useAuthErrorMessage } from './useAuthError'

export const MIN_PASSWORD_LENGTH = 8

/** W1 — Choix d'un nouveau mot de passe (lien de réinitialisation ou d'invitation). */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const { state, role, service } = useAuth()
  const navigate = useNavigate()
  const errorMessage = useAuthErrorMessage()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (state.status === 'loading') return <SplashScreen />

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) return setError(t('auth.passwordTooShort'))
    if (password !== confirm) return setError(t('auth.passwordMismatch'))
    setBusy(true)
    setError(null)
    try {
      await service.updatePassword(password)
      navigate(homePathFor(role), { replace: true })
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="space-y-5 p-5 sm:p-6">
        <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-navy dark:text-ink">{t('auth.resetTitle')}</h1>
        {state.status !== 'signed_in' ? (
          <>
            <FormMessage tone="error">{t('auth.resetExpired')}</FormMessage>
            <Link to="/mot-de-passe-oublie" className="text-sm font-semibold text-cobalt hover:underline">
              {t('auth.forgotTitle')}
            </Link>
          </>
        ) : (
          <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="new-password" className="text-sm font-semibold text-ink">
                {t('auth.newPassword')}
              </label>
              <Input id="new-password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
              <p className="text-xs text-ink-muted">{t('auth.passwordRules')}</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-semibold text-ink">
                {t('auth.confirmPassword')}
              </label>
              <Input id="confirm-password" type="password" autoComplete="new-password" required value={confirm} onChange={(event) => setConfirm(event.target.value)} />
            </div>
            {error && <FormMessage tone="error">{error}</FormMessage>}
            <Button type="submit" block disabled={busy}>
              <KeyRound className="size-4" aria-hidden />
              {t('auth.savePassword')}
            </Button>
          </form>
        )}
      </Card>
    </AuthLayout>
  )
}
