import { LogOut } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAuth } from './AuthProvider'

/** Fenêtre de confirmation : se déconnecter efface la session, le code PIN et le cache du profil sur cet appareil. */
function ConfirmSignOut({ onCancel }: { onCancel: () => void }) {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const [busy, setBusy] = useState(false)
  const cancel = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancel.current?.focus()
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onCancel()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancel])

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/50 p-4 backdrop-blur-sm sm:items-center" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="signout-title"
        aria-describedby="signout-text"
        onClick={(event) => event.stopPropagation()}
        className="dashboard-rise w-full max-w-sm space-y-4 rounded-3xl border border-line bg-surface p-6 shadow-[0_24px_48px_rgba(10,47,79,0.25)]"
      >
        <span className="flex size-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
          <LogOut className="size-6" aria-hidden />
        </span>
        <div className="space-y-1">
          <h2 id="signout-title" className="font-display text-lg font-bold text-ink">{t('auth.signOutConfirm.title')}</h2>
          <p id="signout-text" className="text-sm text-ink-muted">{t('auth.signOutConfirm.text')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button ref={cancel} variant="secondary" onClick={onCancel} disabled={busy}>
            {t('auth.signOutConfirm.cancel')}
          </Button>
          <Button
            className="bg-danger text-white hover:brightness-110"
            disabled={busy}
            onClick={() => {
              setBusy(true)
              // La garde des routes mène ensuite à l'espace public (déconnexion volontaire).
              void signOut()
            }}
          >
            {t('auth.signOut')}
          </Button>
        </div>
      </div>
    </div>
  )
}

/** Bouton de déconnexion avec confirmation : en icône (barres) ou pleine largeur (profil). */
export function SignOutButton({ variant = 'icon', tone = 'light', className }: { variant?: 'icon' | 'block'; tone?: 'light' | 'dark'; className?: string }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  if (!profile) return null

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={t('auth.signOut')}
          title={t('auth.signOut')}
          className={cn(
            'flex size-10 items-center justify-center rounded-xl transition',
            tone === 'dark' ? 'text-white/80 hover:bg-white/10 hover:text-white' : 'text-ink-muted hover:bg-danger/10 hover:text-danger',
            className,
          )}
        >
          <LogOut className="size-5" aria-hidden />
        </button>
      ) : (
        <Button variant="secondary" block onClick={() => setOpen(true)} className={cn('border-none bg-danger/10 text-danger hover:bg-danger/20 focus-visible:ring-danger', className)}>
          <LogOut className="size-4" aria-hidden />
          {t('auth.signOut')}
        </Button>
      )}
      {/* Rendu dans <body> : une barre floutée (backdrop-filter) enfermerait sinon la fenêtre dans ses bords. */}
      {open && createPortal(<ConfirmSignOut onCancel={() => setOpen(false)} />, document.body)}
    </>
  )
}
