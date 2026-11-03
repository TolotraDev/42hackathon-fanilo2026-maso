import { LockKeyhole, LogOut } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Logo } from '@/components/layout/Logo'
import { Button, Input } from '@/components/ui'
import { useAuth } from './AuthProvider'
import { checkPin, hasPin, isUnlocked, lock, markUnlocked, RELOCK_AFTER_MS } from './pin'

const MAX_ATTEMPTS = 5

/** Écran de verrouillage (M14) : au lancement et après 5 minutes en arrière-plan, si un code PIN est défini. */
export function PinLock({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [locked, setLocked] = useState(() => hasPin() && !isUnlocked())
  const [pin, setPin] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [error, setError] = useState(false)

  useEffect(() => {
    let hiddenAt = 0
    const onVisibility = () => {
      if (document.hidden) {
        hiddenAt = Date.now()
      } else if (hasPin() && hiddenAt && Date.now() - hiddenAt > RELOCK_AFTER_MS) {
        lock()
        setLocked(true)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  if (!locked) return children

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (await checkPin(pin)) {
      markUnlocked()
      setLocked(false)
      setPin('')
      setAttempts(0)
      return
    }
    setError(true)
    setPin('')
    setAttempts((count) => count + 1)
  }

  const blocked = attempts >= MAX_ATTEMPTS

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-navy px-6 text-white" role="dialog" aria-modal="true" aria-labelledby="pin-title">
      <Logo />
      <form onSubmit={submit} className="w-full max-w-xs space-y-4 text-center">
        <LockKeyhole className="mx-auto size-8 text-white/80" aria-hidden />
        <h1 id="pin-title" className="font-display text-lg font-bold">{t('pin.title')}</h1>
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={6}
          autoFocus
          aria-label={t('pin.label')}
          disabled={blocked}
          value={pin}
          onChange={(event) => {
            setPin(event.target.value.replace(/\D/g, ''))
            setError(false)
          }}
          className="text-center font-mono text-2xl tracking-[0.5em] text-ink"
        />
        {error && !blocked && <p className="text-sm text-[#F5A3A3]">{t('pin.wrong', { count: MAX_ATTEMPTS - attempts })}</p>}
        {blocked && <p className="text-sm text-[#F5A3A3]">{t('pin.blocked')}</p>}
        <Button type="submit" block disabled={blocked || pin.length < 4}>{t('pin.unlock')}</Button>
      </form>
      <button
        type="button"
        onClick={() => void signOut().then(() => navigate('/connexion'))}
        className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-white/80 hover:text-white"
      >
        <LogOut className="size-4" aria-hidden />
        {t('pin.signOut')}
      </button>
    </div>
  )
}
