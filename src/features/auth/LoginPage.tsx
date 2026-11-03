import { FlaskConical, Globe, LogIn, Mail, UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Input, SegmentedControl } from '@/components/ui'
import { DEMO_PASSWORD, DEMO_USERS } from '@/data/demo/users'
import { homePathFor } from '@/lib/permissions'
import { useAuth } from './AuthProvider'
import { AuthLayout } from './AuthLayout'
import { FormMessage } from './FormMessage'
import { useAuthErrorMessage } from './useAuthError'

type Method = 'password' | 'magic_link'

/** M1 / W1 — Connexion par mot de passe ou lien magique, mode invité, comptes de démonstration. */
export function LoginPage() {
  const { t } = useTranslation()
  const { state, service, signIn, continueAsGuest } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const navigate = useNavigate()
  const isDemo = service.mode === 'demo'

  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(
    state.status === 'signed_out' && state.notice ? t(`auth.error.${state.notice}`) : null,
  )
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null)

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await action()
    } catch (failure) {
      setError(errorMessage(failure))
    } finally {
      setBusy(false)
    }
  }

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (method === 'password') {
      void run(() => signIn(email, password))
    } else {
      void run(async () => {
        await service.sendMagicLink(email.trim(), `${window.location.origin}/`)
        setLinkSentTo(email.trim())
      })
    }
  }

  return (
    <AuthLayout>
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-navy dark:text-ink">{t('auth.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted">{t('auth.subtitle')}</p>
        </div>

        {!isDemo && (
          <SegmentedControl<Method>
            label={t('auth.title')}
            value={method}
            onChange={(next) => {
              setMethod(next)
              setError(null)
              setLinkSentTo(null)
            }}
            options={[
              { value: 'password', label: t('auth.methodPassword') },
              { value: 'magic_link', label: t('auth.methodMagicLink') },
            ]}
          />
        )}

        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-semibold text-ink">
              {t('auth.email')}
            </label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
          </div>
          {method === 'password' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="password" className="text-sm font-semibold text-ink">
                  {t('auth.password')}
                </label>
                {!isDemo && (
                  <Link to="/mot-de-passe-oublie" className="text-xs font-semibold text-cobalt hover:underline">
                    {t('auth.forgot')}
                  </Link>
                )}
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          )}

          {error && <FormMessage tone="error">{error}</FormMessage>}
          {linkSentTo && <FormMessage tone="success">{t('auth.magicLinkSent', { email: linkSentTo })}</FormMessage>}

          <Button type="submit" block disabled={busy}>
            {method === 'password' ? <LogIn className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            {method === 'password' ? t('auth.submit') : t('auth.sendLink')}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-ink-muted">
          <span className="h-px flex-1 bg-line" />
          {t('auth.or')}
          <span className="h-px flex-1 bg-line" />
        </div>

        <div className="space-y-1.5">
          <Button
            variant="secondary"
            block
            onClick={() => {
              continueAsGuest()
              navigate(homePathFor('public'), { replace: true })
            }}
          >
            <UserRound className="size-4" aria-hidden />
            {t('auth.guest')}
          </Button>
          <p className="text-center text-xs text-ink-muted">{t('auth.guestHint')}</p>
          <Link to="/portail" className="flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-cobalt hover:underline">
            <Globe className="size-4" aria-hidden />
            {t('auth.portal')}
          </Link>
        </div>
      </Card>

      {isDemo && (
        <Card className="mt-4 space-y-3 p-5">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
            <FlaskConical className="size-4 text-cobalt" aria-hidden />
            {t('auth.demoTitle')}
          </p>
          <p className="text-xs text-ink-muted">{t('auth.demoHint', { password: DEMO_PASSWORD })}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
            {DEMO_USERS.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => signIn(user.email, DEMO_PASSWORD))}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-canvas disabled:opacity-50"
                >
                  <Avatar name={user.fullName} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink">{user.fullName}</span>
                    <span className="block truncate text-xs text-ink-muted">{user.email}</span>
                  </span>
                  <Badge tone="info">{t(`role.${user.role}`)}</Badge>
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </AuthLayout>
  )
}
