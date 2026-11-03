import { BadgeCheck, Eye, Lock, Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Badge, Button, Card, CaseStatusBadge, Input, SectionTitle, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useAuthErrorMessage } from '@/features/auth/useAuthError'
import { computeSourceScore, missingJustifications, SOURCE_CRITERIA, type CriterionScore, type SourceCriteria } from '@/lib/analysis/sourceScore'
import { domainOf, normalizeUrl, sourceKeyOf } from '@/lib/analysis/url'
import { cn } from '@/lib/cn'
import { BackToResources } from '@/features/ressources/PersonPage'
import { BackToHub } from './ImageAnalysisPage'
import {
  casesLinkedToSource,
  getSource,
  isPersistenceAvailable,
  readConfidentialDetails,
  saveConfidentialDetails,
  saveSource,
  SOURCE_TYPES,
  verifySource,
  type CaseSummary,
  type SourceInput,
  type SourceRecord,
} from './verificationApi'

const SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'
const SCORES: Array<CriterionScore | null> = [null, 0, 1, 2]

type Feedback = { tone: 'error' | 'success'; text: string } | null

/** M7 — Fiche source : score de fiabilité explicable, critère par critère, renseigné par un humain. */
export function SourcePage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const errorMessage = useAuthErrorMessage()
  const isNew = id === 'nouvelle'
  // La fiche est ouverte depuis Vérifier (analyse de lien) ou depuis Ressources (annuaire des sources).
  const fromResources = useLocation().pathname.startsWith('/ressources')
  const base = fromResources ? '/ressources/sources' : '/verifier/sources'
  const Back = fromResources ? BackToResources : BackToHub

  const [record, setRecord] = useState<SourceRecord | null>(null)
  const [form, setForm] = useState<SourceInput>(() => {
    const url = normalizeUrl(params.get('url') ?? '')
    if (!url) return { type: 'site', name: '', url: null, created_on: null, criteria: {} }
    // Réseau social : la fiche décrit le compte (la page), pas toute la plateforme.
    const key = sourceKeyOf(url)
    if (key.account) return { type: 'page', name: key.account, url: key.account.startsWith('id:') ? `https://${key.domain}/profile.php?id=${key.account.slice(3)}` : `https://${key.domain}/${key.account}`, created_on: null, criteria: {} }
    if (key.accountUnknown) return { type: 'page', name: '', url: null, created_on: null, criteria: {} }
    return { type: 'site', name: domainOf(url), url: new URL(url).origin, created_on: null, criteria: {} }
  })
  const [linked, setLinked] = useState<CaseSummary[]>([])
  const [confidential, setConfidential] = useState<{ text: string; revealed: boolean }>({ text: '', revealed: false })
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (isNew || !id || !isPersistenceAvailable()) return
    Promise.all([getSource(id), casesLinkedToSource(id)])
      .then(([source, cases]) => {
        setRecord(source)
        setForm({ type: source.type, name: source.name, url: source.url, created_on: source.created_on, criteria: source.criteria })
        setLinked(cases)
      })
      .catch((error: unknown) => setFeedback({ tone: 'error', text: errorMessage(error) }))
  }, [id, isNew, errorMessage])

  if (!isPersistenceAvailable()) {
    return (
      <div className="space-y-4">
        <Back />
        <Card className="p-4 text-sm text-ink-muted">{t('verifier.summary.needsDatabase')}</Card>
      </div>
    )
  }

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

  const setCriterion = (key: (typeof SOURCE_CRITERIA)[number], patch: { score?: CriterionScore | null; justification?: string }) => {
    setForm((current) => {
      const criteria: SourceCriteria = { ...current.criteria }
      const previous = criteria[key]
      const score = patch.score === undefined ? previous?.score ?? null : patch.score
      if (score === null) delete criteria[key]
      else criteria[key] = { score, justification: patch.justification ?? previous?.justification ?? '' }
      return { ...current, criteria }
    })
  }

  const missing = missingJustifications(form.criteria)
  const score = computeSourceScore(form.criteria)

  const save = (event: React.FormEvent) => {
    event.preventDefault()
    if (missing.length) {
      setFeedback({ tone: 'error', text: t('verifier.source.missingJustification') })
      return
    }
    void act(async () => {
      const saved = await saveSource({ ...form, url: form.url ? normalizeUrl(form.url) : null }, isNew ? undefined : id)
      setRecord(saved)
      if (isNew) navigate(`${base}/${saved.id}`, { replace: true })
    }, t('verifier.source.saved'))
  }

  return (
    <div className="space-y-4">
      <Back />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <form onSubmit={save} className="space-y-4">
          <Card className="space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-navy dark:text-ink">{isNew ? t('verifier.source.create') : form.name}</h2>
              {record?.verified && (
                <Badge tone="success">
                  <BadgeCheck className="size-3.5" aria-hidden />
                  {t('verifier.source.verified')}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="source-name" className="text-sm font-semibold text-ink">{t('verifier.source.name')}</label>
                <Input id="source-name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="source-type" className="text-sm font-semibold text-ink">{t('verifier.source.type')}</label>
                <select id="source-type" className={SELECT} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as SourceInput['type'] })}>
                  {SOURCE_TYPES.map((type) => (
                    <option key={type} value={type}>{t(`verifier.source.types.${type}`)}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="source-url" className="text-sm font-semibold text-ink">{t('verifier.source.url')}</label>
                <Input id="source-url" inputMode="url" value={form.url ?? ''} onChange={(event) => setForm({ ...form, url: event.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="source-created" className="text-sm font-semibold text-ink">{t('verifier.source.createdOn')}</label>
                <Input id="source-created" type="date" value={form.created_on ?? ''} onChange={(event) => setForm({ ...form, created_on: event.target.value || null })} />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <SectionTitle>{t('verifier.source.criteriaTitle')}</SectionTitle>
            <p className="mb-3 text-xs text-ink-muted">{t('verifier.source.criteriaHint')}</p>
            <ul className="divide-y divide-line">
              {SOURCE_CRITERIA.map((key) => {
                const value = form.criteria[key]
                const needsJustification = missing.includes(key)
                return (
                  <li key={key} className="space-y-2 py-3">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-ink">{t(`verifier.source.criteria.${key}`)}</p>
                        <p className="text-xs text-ink-muted">{t(`verifier.source.criteriaHelp.${key}`)}</p>
                      </div>
                      <div role="radiogroup" aria-label={t(`verifier.source.criteria.${key}`)} className="flex shrink-0 gap-1">
                        {SCORES.map((option) => (
                          <button
                            key={String(option)}
                            type="button"
                            role="radio"
                            aria-checked={(value?.score ?? null) === option}
                            onClick={() => setCriterion(key, { score: option })}
                            className={cn(
                              'min-h-9 rounded-lg border px-2.5 text-xs font-semibold transition',
                              (value?.score ?? null) === option ? 'border-cobalt bg-cobalt text-white' : 'border-line text-ink-muted hover:text-ink',
                            )}
                          >
                            {t(`verifier.source.scoreLabel.${option ?? 'none'}`)}
                          </button>
                        ))}
                      </div>
                    </div>
                    {value && (
                      <Textarea
                        rows={2}
                        aria-label={`${t(`verifier.source.criteria.${key}`)} — ${t('verifier.source.justification')}`}
                        aria-invalid={needsJustification}
                        placeholder={t('verifier.source.justification')}
                        value={value.justification}
                        onChange={(event) => setCriterion(key, { justification: event.target.value })}
                        className={cn(needsJustification && 'border-danger')}
                      />
                    )}
                  </li>
                )
              })}
            </ul>
          </Card>

          {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
          <Button type="submit" block disabled={busy}>
            <Save className="size-4" aria-hidden />
            {t('verifier.source.save')}
          </Button>
        </form>

        <div className="space-y-4">
          <Card className="p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('verifier.source.score')}</p>
            <p className="font-display text-4xl font-extrabold text-navy dark:text-ink">{score === null ? '—' : `${new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(score)}/10`}</p>
            <p className="mt-2 text-xs text-ink-muted">{t('verifier.source.scoreHint')}</p>
            {!isNew && role === 'editor_in_chief' && record && (
              <Button
                variant="secondary"
                block
                className="mt-3"
                disabled={busy}
                onClick={() =>
                  void act(async () => {
                    await verifySource(record.id, !record.verified)
                    setRecord({ ...record, verified: !record.verified })
                  }, t('verifier.source.saved'))
                }
              >
                <BadgeCheck className="size-4" aria-hidden />
                {record.verified ? t('verifier.source.unverify') : t('verifier.source.verify')}
              </Button>
            )}
          </Card>

          {!isNew && record && (
            <Card className="space-y-2 p-4">
              <p className="flex items-center gap-1.5 font-display text-sm font-bold text-navy dark:text-ink">
                <Lock className="size-4" aria-hidden />
                {t('verifier.source.confidentialTitle')}
              </p>
              <p className="text-xs text-ink-muted">{t('verifier.source.confidentialHint')}</p>
              {record.confidential && !confidential.revealed ? (
                <Button
                  variant="secondary"
                  block
                  disabled={busy}
                  onClick={() =>
                    void act(async () => {
                      const text = await readConfidentialDetails(record.id)
                      setConfidential({ text: text ?? '', revealed: true })
                    }, t('verifier.source.confidentialLogged'))
                  }
                >
                  <Eye className="size-4" aria-hidden />
                  {t('verifier.source.reveal')}
                </Button>
              ) : (
                <>
                  <Textarea
                    rows={3}
                    aria-label={t('verifier.source.confidentialTitle')}
                    value={confidential.text}
                    onChange={(event) => setConfidential({ ...confidential, text: event.target.value })}
                  />
                  <Button
                    variant="secondary"
                    block
                    disabled={busy || !confidential.text.trim()}
                    onClick={() =>
                      void act(async () => {
                        await saveConfidentialDetails(record.id, confidential.text)
                        setRecord({ ...record, confidential: true })
                      }, t('verifier.source.saved'))
                    }
                  >
                    <Lock className="size-4" aria-hidden />
                    {t('verifier.source.saveConfidential')}
                  </Button>
                </>
              )}
            </Card>
          )}

          {!isNew && (
            <Card className="p-4">
              <SectionTitle>{t('verifier.source.linkedCases')}</SectionTitle>
              {linked.length === 0 ? (
                <p className="text-xs text-ink-muted">{t('verifier.source.noLinkedCase')}</p>
              ) : (
                <ul className="space-y-1.5">
                  {linked.map((item) => (
                    <li key={item.id} className="flex items-center gap-2 text-xs">
                      <span className="min-w-0 flex-1 truncate text-ink">{item.title}</span>
                      <CaseStatusBadge status={item.status} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
