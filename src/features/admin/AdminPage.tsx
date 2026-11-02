import { UserPlus } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useShellSearch } from '@/components/layout/AppShell'
import { Avatar, Badge, Button, Card, Input, SectionTitle } from '@/components/ui'
import { DEMO_PASSWORD } from '@/data/demo/users'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { matchesQuery } from '@/lib/text'
import { LANGUAGES, USER_ROLES, type Language, type Profile, type UserRole } from '@/types/domain'

const SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'

type Feedback = { tone: 'error' | 'success'; text: string } | null

/** W12 — Administration des comptes : invitation, rôle, suspension, statistiques d'usage. */
export function AdminPage() {
  const { t } = useTranslation()
  const { service, profile: me } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const query = useShellSearch()

  const [users, setUsers] = useState<Profile[]>([])
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState(false)
  const [invite, setInvite] = useState<{ email: string; fullName: string; role: UserRole; language: Language }>({
    email: '',
    fullName: '',
    role: 'journalist',
    language: 'fr',
  })

  const load = useCallback(async () => {
    try {
      setUsers(await service.admin.listUsers())
    } catch (failure) {
      setFeedback({ tone: 'error', text: errorMessage(failure) })
    }
  }, [service, errorMessage])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (action: () => Promise<void>, success: string) => {
    setBusy(true)
    setFeedback(null)
    try {
      await action()
      setFeedback({ tone: 'success', text: success })
      await load()
    } catch (failure) {
      setFeedback({ tone: 'error', text: errorMessage(failure) })
    } finally {
      setBusy(false)
    }
  }

  const onInvite = (event: React.FormEvent) => {
    event.preventDefault()
    const email = invite.email.trim()
    const success =
      service.mode === 'demo' ? t('admin.invitedDemo', { email, password: DEMO_PASSWORD }) : t('admin.invited', { email })
    void act(async () => {
      await service.admin.inviteUser({ ...invite, email })
      setInvite((current) => ({ ...current, email: '', fullName: '' }))
    }, success)
  }

  const activeCount = users.filter((user) => user.active).length
  const visibleUsers = users.filter((user) => matchesQuery(query, user.fullName, user.email, t(`role.${user.role}`)))

  return (
    <div className="space-y-4">
      <section>
        <SectionTitle>{t('admin.usage')}</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          <Card className="px-3 py-3 text-center">
            <p className="font-display text-2xl font-extrabold text-navy dark:text-ink">{activeCount}</p>
            <p className="text-xs text-ink-muted">{t('admin.activeUsers')}</p>
          </Card>
          <Card className="px-3 py-3 text-center">
            <p className="font-display text-2xl font-extrabold text-navy dark:text-ink">{users.length - activeCount}</p>
            <p className="text-xs text-ink-muted">{t('admin.suspendedUsers')}</p>
          </Card>
          {USER_ROLES.map((role) => (
            <Card key={role} className="px-3 py-3 text-center">
              <p className="font-display text-2xl font-extrabold text-navy dark:text-ink">
                {users.filter((user) => user.active && user.role === role).length}
              </p>
              <p className="text-xs text-ink-muted">{t(`role.${role}`)}</p>
            </Card>
          ))}
        </div>
      </section>

      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[22rem_minmax(0,1fr)] lg:items-start">
        <Card className="p-4">
          <SectionTitle>{t('admin.inviteTitle')}</SectionTitle>
          <form onSubmit={onInvite} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="invite-name" className="text-sm font-semibold text-ink">
                {t('admin.fullName')}
              </label>
              <Input
                id="invite-name"
                required
                value={invite.fullName}
                onChange={(event) => setInvite({ ...invite, fullName: event.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="invite-email" className="text-sm font-semibold text-ink">
                {t('auth.email')}
              </label>
              <Input
                id="invite-email"
                type="email"
                required
                value={invite.email}
                onChange={(event) => setInvite({ ...invite, email: event.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label htmlFor="invite-role" className="text-sm font-semibold text-ink">
                  {t('admin.role')}
                </label>
                <select
                  id="invite-role"
                  className={SELECT}
                  value={invite.role}
                  onChange={(event) => setInvite({ ...invite, role: event.target.value as UserRole })}
                >
                  {USER_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {t(`role.${role}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="invite-language" className="text-sm font-semibold text-ink">
                  {t('admin.language')}
                </label>
                <select
                  id="invite-language"
                  className={SELECT}
                  value={invite.language}
                  onChange={(event) => setInvite({ ...invite, language: event.target.value as Language })}
                >
                  {LANGUAGES.map((language) => (
                    <option key={language} value={language}>
                      {t(`language.${language}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <Button type="submit" block disabled={busy}>
              <UserPlus className="size-4" aria-hidden />
              {t('admin.invite')}
            </Button>
          </form>
        </Card>

        <section>
          <SectionTitle>{t('admin.usersTitle')}</SectionTitle>
          <Card className="divide-y divide-line">
            {visibleUsers.map((user) => {
              const isMe = user.id === me?.id
              return (
                <div key={user.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Avatar name={user.fullName || user.email} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-ink">
                        {user.fullName || user.email}
                        {isMe && <span className="font-normal text-ink-muted"> ({t('admin.you')})</span>}
                      </p>
                      <p className="truncate text-xs text-ink-muted">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={user.active ? 'success' : 'danger'}>{user.active ? t('admin.active') : t('admin.suspended')}</Badge>
                    <select
                      aria-label={`${t('admin.role')} — ${user.fullName || user.email}`}
                      className={`${SELECT} w-auto`}
                      value={user.role}
                      disabled={isMe || busy}
                      onChange={(event) =>
                        void act(() => service.admin.setRole(user.id, event.target.value as UserRole), t('admin.updated'))
                      }
                    >
                      {USER_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {t(`role.${role}`)}
                        </option>
                      ))}
                    </select>
                    <Button
                      variant="secondary"
                      className="min-h-11 shrink-0"
                      disabled={isMe || busy}
                      onClick={() => void act(() => service.admin.setActive(user.id, !user.active), t('admin.updated'))}
                    >
                      {user.active ? t('admin.suspend') : t('admin.reactivate')}
                    </Button>
                  </div>
                </div>
              )
            })}
            {visibleUsers.length === 0 && <p className="px-4 py-8 text-center text-sm text-ink-muted">{t('common.noResult')}</p>}
          </Card>
        </section>
      </div>
    </div>
  )
}
