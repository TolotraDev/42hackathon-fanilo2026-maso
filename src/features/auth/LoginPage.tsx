import { Eye, EyeOff, FlaskConical, Globe, LockKeyhole, LogIn, Mail } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, Input, SegmentedControl } from '@/components/ui'
import { DEMO_PASSWORD, DEMO_USERS } from '@/data/demo/users'
import { useAuth } from './AuthProvider'
import { AuthLayout } from './AuthLayout'
import { FormMessage } from './FormMessage'
import { useAuthErrorMessage } from './useAuthError'

type Method = 'password' | 'magic_link'

/** M1 / W1 — Connexion par mot de passe ou lien magique, comptes de démonstration ; le public passe par le portail. */
export function LoginPage() {
  const { t } = useTranslation()
  const { state, service, signIn } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const isDemo = service.mode === 'demo'

  const [method, setMethod] = useState<Method>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      const trimmedEmail = email.trim()
      if (trimmedEmail.length < 8 || password.length < 8) {
        setError(t('auth.error.shortCredentials'))
        return
      }
      void run(() => signIn(trimmedEmail, password))
      return
    }

    const trimmedEmail = email.trim()
    if (trimmedEmail.length < 8) {
      setError(t('auth.error.shortEmail'))
      return
    }

    void run(async () => {
      await service.sendMagicLink(trimmedEmail, `${window.location.origin}/`)
      setLinkSentTo(trimmedEmail)
    })
  }

  return (
    <AuthLayout>
      <Card className="space-y-5 border border-line bg-surface p-5 text-ink shadow-[0_18px_32px_rgba(10,47,79,0.12)] sm:p-6 dark:border-white/10 dark:bg-[#0F2C46] dark:text-white dark:shadow-[0_18px_32px_rgba(10,47,79,0.28)]">
        <div>
          <h1 className="font-display text-xl font-extrabold uppercase tracking-wide text-ink dark:text-white">{t('auth.title')}</h1>
          <p className="mt-1 text-sm text-ink-muted dark:text-white/70">{t('auth.subtitle')}</p>
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
            <label htmlFor="email" className="text-lg font-semibold text-ink dark:text-white/90">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted dark:text-white/55" aria-hidden />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                minLength={8}
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  if (error) setError(null)
                }}
                className="border-2 border-cobalt/70 bg-white pl-10 pr-3 text-ink placeholder:text-ink-muted focus:border-cobalt focus:ring-4 focus:ring-cobalt/15 dark:border-cobalt/80 dark:bg-white/5 dark:text-white dark:placeholder:text-white/45"
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
          </div>
          {method === 'password' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="password" className="text-lg font-semibold text-ink dark:text-white/90">
                  {t('auth.password')}
                </label>
                {!isDemo && (
                  <Link to="/mot-de-passe-oublie" className="text-sm font-semibold text-cobalt hover:underline">
                    {t('auth.forgot')}
                  </Link>
                )}
              </div>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted dark:text-white/55" aria-hidden />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    if (error) setError(null)
                  }}
                  className="border-2 border-cobalt/70 bg-white pl-10 pr-11 text-ink placeholder:text-ink-muted focus:border-cobalt focus:ring-4 focus:ring-cobalt/15 dark:border-cobalt/80 dark:bg-white/5 dark:text-white dark:placeholder:text-white/45"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  onClick={() => setShowPassword((value) => !value)}
                  className="absolute inset-y-0 right-3 flex items-center text-ink-muted transition hover:text-ink dark:text-white/60 dark:hover:text-white"
                >
                  {showPassword ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
                </button>
              </div>
            </div>
          )}

          {error && <FormMessage tone="error">{error}</FormMessage>}
          {linkSentTo && <FormMessage tone="success">{t('auth.magicLinkSent', { email: linkSentTo })}</FormMessage>}

          <Button type="submit" block disabled={busy} className="bg-[#1976D2] text-white shadow-[0_10px_18px_rgba(25,118,210,0.28)] hover:brightness-105">
            {method === 'password' ? <LogIn className="size-4" aria-hidden /> : <Mail className="size-4" aria-hidden />}
            {method === 'password' ? t('auth.submit') : t('auth.sendLink')}
          </Button>
        </form>

        <div className="flex items-center gap-3 text-xs text-ink-muted dark:text-white/60">
          <span className="h-px flex-1 bg-line dark:bg-white/15" />
          {t('auth.or')}
          <span className="h-px flex-1 bg-line dark:bg-white/15" />
        </div>

        <Link
          to="/portail"
          className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-surface/90 dark:border-white/10 dark:bg-white dark:text-[#0F2C46] dark:hover:bg-[#F1F5F9]"
        >
          <Globe className="size-4" aria-hidden />
          {t('auth.portal')}
        </Link>
      </Card>

      {isDemo && (
        <Card className="mt-4 space-y-3 border-line bg-surface p-5 text-ink dark:border-white/10 dark:bg-[#0f2f4d] dark:text-white">
          <p className="flex items-center gap-2 font-display text-sm font-bold text-ink dark:text-white">
            <FlaskConical className="size-4 text-cobalt" aria-hidden />
            {t('auth.demoTitle')}
          </p>
          <p className="text-xs text-ink-muted dark:text-white/70">{t('auth.demoHint', { password: DEMO_PASSWORD })}</p>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line dark:divide-white/10 dark:border-white/10">
            {DEMO_USERS.map((user) => (
              <li key={user.id}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void run(() => signIn(user.email, DEMO_PASSWORD))}
                  className="flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-line/70 disabled:opacity-50 dark:hover:bg-white/5"
                >
                  <Avatar name={user.fullName} className="size-9" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-ink dark:text-white">{user.fullName}</span>
                    <span className="block truncate text-xs text-ink-muted dark:text-white/60">{user.email}</span>
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
