import { Mail, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { DEMO_PASSWORD } from '@/data/demo/users'
import { LANGUAGES, USER_ROLES, type Language, type UserRole } from '@/types/domain'
import type { DirectoryPerson } from './types'

const SELECT =
  'min-h-10 w-full rounded-xl border border-line bg-surface px-3 text-sm text-ink focus:border-cobalt focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/20'

/** Rôle proposé d'après la fonction indiquée sur la fiche (modifiable avant l'envoi). */
export function guessRole(position: string | null): UserRole {
  const value = (position ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  if (/fact.?check|verificat/.test(value)) return 'fact_checker'
  if (/redact\w* en chef|editor.in.chief|chief editor|rédac.*chef|redac.*chef/.test(value)) return 'editor_in_chief'
  return 'journalist'
}

/**
 * Invitation directe depuis la fiche de l'annuaire (administrateur) : la personne reçoit par e-mail
 * le lien pour choisir son mot de passe — même envoi que l'écran Administration.
 */
export function InviteFromDirectory({ person }: { person: DirectoryPerson }) {
  const { t, i18n } = useTranslation()
  const { service } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState<UserRole>(() => guessRole(person.position))
  const [language, setLanguage] = useState<Language>(
    () => person.languages.find((item) => item === i18n.resolvedLanguage) ?? person.languages[0] ?? 'fr',
  )
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)
  const email = person.email?.trim() ?? ''

  if (!email) return <p className="text-xs text-ink-muted">{t('ressources.invite.noEmail')}</p>

  const send = async () => {
    setBusy(true)
    setFeedback(null)
    try {
      await service.admin.inviteUser({ email, fullName: person.fullName, role, language })
      setFeedback({
        tone: 'success',
        text: service.mode === 'demo' ? t('admin.invitedDemo', { email, password: DEMO_PASSWORD }) : t('admin.invited', { email }),
      })
      setOpen(false)
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      {!open ? (
        <Button block onClick={() => { setOpen(true); setFeedback(null) }}>
          <Mail className="size-4" aria-hidden />
          {t('ressources.invite.button')}
        </Button>
      ) : (
        <div className="space-y-3 rounded-xl border border-cobalt/40 bg-cobalt/5 p-3">
          <p className="text-sm text-ink">{t('ressources.invite.hint', { name: person.fullName, email })}</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor="invite-role" className="text-xs font-semibold text-ink">{t('ressources.invite.role')}</label>
              <select id="invite-role" className={SELECT} value={role} onChange={(event) => setRole(event.target.value as UserRole)}>
                {USER_ROLES.map((item) => (
                  <option key={item} value={item}>{t(`role.${item}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label htmlFor="invite-language" className="text-xs font-semibold text-ink">{t('ressources.invite.language')}</label>
              <select id="invite-language" className={SELECT} value={language} onChange={(event) => setLanguage(event.target.value as Language)}>
                {LANGUAGES.map((item) => (
                  <option key={item} value={item}>{t(`language.${item}`)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={() => void send()}>
              <Send className="size-4" aria-hidden />
              {busy ? t('ressources.invite.sending') : t('ressources.invite.send')}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setOpen(false)}>{t('ressources.invite.cancel')}</Button>
          </div>
        </div>
      )}
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
    </div>
  )
}
