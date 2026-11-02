import { ArrowLeft, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, Card, Input } from '@/components/ui'
import { useAuth } from './AuthProvider'
import { AuthLayout } from './AuthLayout'
import { FormMessage } from './FormMessage'
import { useAuthErrorMessage } from './useAuthError'

/** W1 — Mot de passe oublié : envoi d'un lien de réinitialisation. */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const { service } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await service.sendPasswordReset(email.trim(), `${window.location.origin}/nouveau-mot-de-passe`)
      setSentTo(email.trim())
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthLayout>
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-navy dark:text-ink">{t('auth.forgotTitle')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('auth.forgotHint')}</p>
        </div>
        <form onSubmit={(event) => void onSubmit(event)} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              {t('auth.email')}
            </label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {error && <FormMessage tone="error">{error}</FormMessage>}
          {sentTo && <FormMessage tone="success">{t('auth.resetSent', { email: sentTo })}</FormMessage>}
          <Button type="submit" block disabled={busy}>
            <Mail className="size-4" aria-hidden />
            {t('auth.sendReset')}
          </Button>
        </form>
        <Link to="/connexion" className="inline-flex items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
          <ArrowLeft className="size-4" aria-hidden />
          {t('auth.backToLogin')}
        </Link>
      </Card>
    </AuthLayout>
  )
}
