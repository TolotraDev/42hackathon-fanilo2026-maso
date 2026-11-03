import { ArrowLeft, BadgeCheck, Mail, MessageCircle, Pencil, Phone, Send, Star, UserX } from 'lucide-react'
import { useCallback, useEffect, useState, type CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, Badge, Button, Card, SectionTitle, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { isPersistenceAvailable, listOpenCases, type CaseSummary } from '@/features/verifier/verificationApi'
import { cn } from '@/lib/cn'
import { PackNotice } from './PackNotice'
import {
  createConfirmation,
  listConfirmations,
  saveNote,
  updateConfirmation,
  validatePerson,
  withdrawPerson,
} from './resourcesApi'
import { needsRevalidation } from './rules'
import {
  canManageResources,
  CHANNELS,
  CONFIRMATION_STATUSES,
  type Channel,
  type ConfirmationRequest,
  type ConfirmationStatus,
} from './types'
import { useDirectory } from './useResources'

const SELECT =
  'min-h-10 rounded-xl border border-line bg-surface px-3 text-xs text-ink transition-colors duration-150 hover:border-cobalt/50 focus:border-cobalt focus:outline-none focus-visible:ring-2 focus-visible:ring-cobalt/20'

const digits = (phone: string) => phone.replace(/[^\d]/g, '')

type Feedback = { tone: 'error' | 'success'; text: string } | null

export function BackToResources() {
  const { t } = useTranslation()
  return (
    <Link
      to="/ressources"
      className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
    >
      <ArrowLeft className="size-4" aria-hidden />
      {t('ressources.back')}
    </Link>
  )
}

/** M9 — Fiche personne-ressource : contact en un geste, notes privées, demandes de confirmation. */
export function PersonPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const { people, notes, setNotes, pack, reload } = useDirectory()
  const person = people?.find((item) => item.id === id) ?? null
  const note = (id && notes[id]) || { favorite: false, note: '' }

  const [draft, setDraft] = useState<string | null>(null)
  const [requests, setRequests] = useState<ConfirmationRequest[]>([])
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [newRequest, setNewRequest] = useState<{ caseId: string; channel: Channel }>({
    caseId: '',
    channel: 'phone',
  })
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState(false)

  const isGuest = role === 'public'
  const manager = canManageResources(role)
  const canTrack = isPersistenceAvailable() && !isGuest && role !== 'admin'

  const loadRequests = useCallback(async () => {
    if (!id || !canTrack) return
    try {
      const [rows, open] = await Promise.all([listConfirmations(id), listOpenCases()])
      setRequests(rows)
      setCases(open)
    } catch {
      // hors ligne : les demandes reviendront au retour du réseau
    }
  }, [id, canTrack])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  const act = async (action: () => Promise<void>, success: string) => {
    setBusy(true)
    setFeedback(null)
    try {
      await action()
      setFeedback({ tone: 'success', text: success })
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error) })
    } finally {
      setBusy(false)
    }
  }

  const persistNote = (value: { favorite: boolean; note: string }) =>
    act(async () => {
      await saveNote(id!, value)
      setNotes({ ...notes, [id!]: value })
      setDraft(null)
    }, t('ressources.person.noteSaved'))

  if (!people) {
    return (
      <div className="space-y-4">
        <BackToResources />
        <Card className="flex items-center gap-4 p-4">
          <div className="size-14 animate-pulse rounded-full bg-line" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-line" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-line" />
          </div>
        </Card>
      </div>
    )
  }

  if (!person) {
    return (
      <div className="space-y-4">
        <BackToResources />
        <Card className="p-4 text-sm text-ink-muted">{t('ressources.person.notFound')}</Card>
      </div>
    )
  }

  const hasContacts = Boolean(person.phone || person.whatsapp || person.email)
  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(new Date(iso))

  return (
    <div className="space-y-4">
      <BackToResources />
      <PackNotice pack={pack} />
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}

      {/* Grille principale */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        
        {/* Colonne de gauche : Informations */}
        <Card
          className="dashboard-rise space-y-4 border-t-4 border-t-white/20 p-5 shadow-sm"
          style={{ '--i': 0 } as CSSProperties}
        >
          <div className="flex items-start gap-3">
            <Avatar name={person.fullName} className="size-14 text-base shadow-sm" />
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-lg font-bold text-navy dark:text-ink">
                {person.fullName}
              </h2>
              <p className="text-sm text-ink">{person.position}</p>
              <p className="text-xs text-ink-muted">{person.organization}</p>
            </div>
            {!isGuest && (
              <button
                type="button"
                aria-pressed={note.favorite}
                aria-label={t('ressources.favorite')}
                disabled={busy}
                onClick={() => void persistNote({ ...note, favorite: !note.favorite })}
                className="flex size-11 items-center justify-center rounded-full transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-warning"
              >
                <Star
                  className={cn(
                    'size-6',
                    note.favorite ? 'fill-warning text-warning' : 'text-ink-muted',
                  )}
                  aria-hidden
                />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {person.domains.map((domain) => (
              <Badge key={domain} className="bg-cobalt/10 text-cobalt hover:bg-cobalt/20 border-none">
                {domain}
              </Badge>
            ))}
          </div>

          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
            <dt className="text-ink-muted">{t('ressources.filter.region')}</dt>
            <dd className="text-ink">{person.region ?? '—'}</dd>
            <dt className="text-ink-muted">{t('ressources.person.languages')}</dt>
            <dd className="text-ink">
              {person.languages.map((language) => t(`language.${language}`)).join(', ') || '—'}
            </dd>
            {!isGuest && (
              <>
                <dt className="text-ink-muted">{t('ressources.person.visibility')}</dt>
                <dd className="text-ink">{t(`ressources.visibility.${person.visibility}`)}</dd>
                <dt className="text-ink-muted">{t('ressources.person.lastValidated')}</dt>
                <dd className="text-ink">
                  {person.lastValidatedDaysAgo === null
                    ? t('ressources.person.neverValidated')
                    : t('ressources.person.daysAgo', { count: person.lastValidatedDaysAgo })}
                  {needsRevalidation(person) && (
                    <Badge tone="warning" className="ml-2">
                      {t('ressources.status.revalidate')}
                    </Badge>
                  )}
                </dd>
              </>
            )}
          </dl>

          {!isGuest &&
            (hasContacts ? (
              <div className="grid grid-cols-3 gap-2">
                {person.phone && (
                  <a
                    href={`tel:${person.phone.replace(/\s/g, '')}`}
                    className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-cobalt/10 text-xs font-semibold text-cobalt transition-all hover:bg-cobalt/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                  >
                    <Phone className="size-5" aria-hidden />
                    {t('ressources.person.call')}
                  </a>
                )}
                {person.whatsapp && (
                  <a
                    href={`https://wa.me/${digits(person.whatsapp)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-success/10 text-xs font-semibold text-success transition-all hover:bg-success/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success"
                  >
                    <MessageCircle className="size-5" aria-hidden />
                    WhatsApp
                  </a>
                )}
                {person.email && (
                  <a
                    href={`mailto:${person.email}`}
                    className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl bg-surface border border-line text-xs font-semibold text-cobalt transition-all hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
                  >
                    <Mail className="size-5" aria-hidden />
                    {t('ressources.person.email')}
                  </a>
                )}
              </div>
            ) : (
              <p className="rounded-xl bg-canvas/50 px-3 py-2 text-xs text-ink-muted">
                {t('ressources.person.contactsHidden')}
              </p>
            ))}
          {isGuest && (
            <p className="rounded-xl bg-canvas/50 px-3 py-2 text-xs text-ink-muted">
              {t('ressources.guestHint')}
            </p>
          )}
        </Card>

        {/* Colonne de droite : Note privée + Gestion */}
        <div className="space-y-4">
          {!isGuest && (
            <Card
              className="dashboard-rise space-y-2 border-t-4 border-t-white/20 p-5 shadow-sm"
              style={{ '--i': 1 } as CSSProperties}
            >
              <label
                htmlFor="private-note"
                className="font-display text-sm font-bold text-navy dark:text-ink"
              >
                {t('ressources.person.privateNote')}
              </label>
              <p className="text-xs text-ink-muted">{t('ressources.person.privateNoteHint')}</p>
              <Textarea
                id="private-note"
                rows={4}
                className="bg-surface/50 focus:bg-surface"
                value={draft ?? note.note}
                onChange={(event) => setDraft(event.target.value)}
              />
              <Button
                variant="secondary"
                block
                disabled={busy || draft === null}
                onClick={() => void persistNote({ ...note, note: draft ?? '' })}
              >
                {t('ressources.person.saveNote')}
              </Button>
            </Card>
          )}

          {manager && isPersistenceAvailable() && (
            <Card
              className="dashboard-rise space-y-2 border-t-4 border-t-white/20 p-5 shadow-sm"
              style={{ '--i': 2 } as CSSProperties}
            >
              <p className="font-display text-sm font-bold text-navy dark:text-ink">
                {t('ressources.manage')}
              </p>
              <Link
                to={`/ressources/personnes/${person.id}/modifier`}
                className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-line text-sm font-semibold text-cobalt transition-colors hover:bg-canvas focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt"
              >
                <Pencil className="size-4" aria-hidden />
                {t('ressources.person.edit')}
              </Link>
              <Button
                variant="secondary"
                block
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await validatePerson(person.id)
                    await reload()
                  }, t('ressources.person.validated'))
                }
              >
                <BadgeCheck className="size-4" aria-hidden />
                {person.validated
                  ? t('ressources.person.revalidate')
                  : t('ressources.person.validate')}
              </Button>
              <Button
                variant="ghost"
                block
                disabled={busy}
                className="text-danger hover:bg-danger/10"
                onClick={() => {
                  if (!window.confirm(t('ressources.person.withdrawConfirm', { name: person.fullName })))
                    return
                  void act(async () => {
                    await withdrawPerson(person.id)
                    navigate('/ressources/annuaire')
                  }, t('ressources.person.withdrawn'))
                }}
              >
                <UserX className="size-4" aria-hidden />
                {t('ressources.person.withdraw')}
              </Button>
            </Card>
          )}
        </div>

        {/* Bas de page : Demandes de confirmation (prend toute la largeur) */}
        {canTrack && (
          <Card
            className="dashboard-rise col-span-1 lg:col-span-2 space-y-3 border-t-4 border-t-white/20 p-5 shadow-sm"
            style={{ '--i': 3 } as CSSProperties}
          >
            <SectionTitle>{t('ressources.person.requests')}</SectionTitle>
            <p className="text-xs text-ink-muted">{t('ressources.person.requestsHint')}</p>
            
            <div className="space-y-2">
              {requests.map((request) => (
                <ConfirmationRow
                  key={request.id}
                  request={request}
                  busy={busy}
                  formatDate={formatDate}
                  onSave={(status, response) =>
                    act(async () => {
                      await updateConfirmation(request.id, status, response)
                      await loadRequests()
                    }, t('ressources.person.requestSaved'))
                  }
                />
              ))}
            </div>

            <form
              className="flex flex-col gap-2 sm:flex-row pt-2"
              onSubmit={(event) => {
                event.preventDefault()
                void act(async () => {
                  await createConfirmation(person.id, newRequest.caseId, newRequest.channel)
                  setNewRequest({ ...newRequest, caseId: '' })
                  await loadRequests()
                }, t('ressources.person.requestSaved'))
              }}
            >
              <select
                aria-label={t('ressources.person.case')}
                required
                className={cn(SELECT, 'min-w-0 flex-1')}
                value={newRequest.caseId}
                onChange={(event) => setNewRequest({ ...newRequest, caseId: event.target.value })}
              >
                <option value="">{t('ressources.person.case')}</option>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.title}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('ressources.person.channel')}
                className={SELECT}
                value={newRequest.channel}
                onChange={(event) =>
                  setNewRequest({ ...newRequest, channel: event.target.value as Channel })
                }
              >
                {CHANNELS.map((channel) => (
                  <option key={channel} value={channel}>
                    {t(`ressources.channel.${channel}`)}
                  </option>
                ))}
              </select>
              <Button 
                type="submit" 
                className="min-h-10 text-xs shrink-0" 
                disabled={busy || !newRequest.caseId}
              >
                <Send className="size-4" aria-hidden />
                {t('ressources.person.newRequest')}
              </Button>
            </form>
            {cases.length === 0 && (
              <p className="text-xs text-ink-muted">{t('verifier.attach.noOpenCase')}</p>
            )}
          </Card>
        )}

      </div>
    </div>
  )
}

function ConfirmationRow({
  request,
  busy,
  formatDate,
  onSave,
}: {
  request: ConfirmationRequest
  busy: boolean
  formatDate: (iso: string) => string
  onSave: (status: ConfirmationStatus, response: string) => void
}) {
  const { t } = useTranslation()
  const [status, setStatus] = useState(request.status)
  const [response, setResponse] = useState(request.response ?? '')
  const changed = status !== request.status || response !== (request.response ?? '')

  return (
    <div className="space-y-2 rounded-xl border border-line/60 bg-canvas/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-ink">{request.caseTitle}</span>
        <span className="text-ink-muted">
          {t(`ressources.channel.${request.channel}`)} · {formatDate(request.createdAt)}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <select
          aria-label={t('ressources.person.status')}
          className={SELECT}
          value={status}
          onChange={(event) => setStatus(event.target.value as ConfirmationStatus)}
        >
          {CONFIRMATION_STATUSES.map((value) => (
            <option key={value} value={value}>
              {t(`ressources.confirmation.${value}`)}
            </option>
          ))}
        </select>
        <Textarea
          rows={1}
          aria-label={t('ressources.person.response')}
          placeholder={t('ressources.person.response')}
          value={response}
          onChange={(event) => setResponse(event.target.value)}
          className="min-h-10 flex-1 py-2"
        />
        <Button
          variant="secondary"
          className="min-h-10 text-xs shrink-0"
          disabled={busy || !changed}
          onClick={() => onSave(status, response)}
        >
          {t('ressources.person.updateRequest')}
        </Button>
      </div>
    </div>
  )
}