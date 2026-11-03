import { ArrowLeft, CircleCheck, CircleX, ExternalLink, Gavel, GitCompare, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useParams } from 'react-router-dom'
import { Badge, Button, Card, CaseStatusBadge, SectionTitle, Textarea, VerdictBadge } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { useCase, useCaseStore } from '@/features/dossiers/CaseStoreProvider'
import { DECISION_TYPES, type CaseDetail, type DecisionType, type ReportClaim } from '@/features/dossiers/model'
import { useCaseErrorMessage } from '@/features/dossiers/useCaseError'
import { QrImage, reportUrl, SharePanel, verifyUrl } from '@/features/portail/components'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { cn } from '@/lib/cn'
import { diffWords, hasChanges, type DiffPart } from './diff'
import { evidenceLabel, isSupported, PUBLICATION_BLOCKERS, reportBlockers } from './publication'

const claimsText = (claims: ReportClaim[]) => claims.map((claim, index) => `${index + 1}. ${claim.text}`).join('\n')

function Diff({ parts }: { parts: DiffPart[] }) {
  return (
    <p className="whitespace-pre-line text-sm leading-relaxed text-ink">
      {parts.map((part, index) =>
        part.kind === 'same' ? (
          <span key={index}>{part.text}</span>
        ) : part.kind === 'added' ? (
          <ins key={index} className="rounded bg-success/20 no-underline">{part.text}</ins>
        ) : (
          <del key={index} className="rounded bg-danger/15 text-danger">{part.text}</del>
        ),
      )}
    </p>
  )
}

/** Comparaison d'une version précédente avec la version actuelle du rapport. */
function VersionCompare({ detail }: { detail: CaseDetail }) {
  const { t } = useTranslation()
  const versions = detail.reportVersions
  const [selected, setSelected] = useState(versions.at(-1)?.version ?? 0)
  const report = detail.report
  if (!report) return null
  if (versions.length === 0) return <p className="text-sm text-ink-muted">{t('revue.versions.none')}</p>
  const old = versions.find((version) => version.version === selected) ?? versions.at(-1)!
  const fields = [
    { key: 'summary', before: old.summary, after: report.summary },
    { key: 'explanation', before: old.explanation, after: report.explanation },
    { key: 'method', before: old.method, after: report.method },
    { key: 'claims', before: claimsText(old.claims), after: claimsText(report.claims) },
  ].map((field) => ({ ...field, parts: diffWords(field.before, field.after) }))
  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <label htmlFor="compare-version" className="text-sm font-semibold text-ink">{t('revue.versions.compare')}</label>
        <select id="compare-version" className="min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink" value={old.version} onChange={(event) => setSelected(Number(event.target.value))}>
          {versions.map((version) => (
            <option key={version.version} value={version.version}>
              {t('revue.versions.option', { version: version.version, current: report.version ?? versions.length + 1 })}
            </option>
          ))}
        </select>
      </div>
      <p className="text-xs text-ink-muted">
        <ins className="rounded bg-success/20 px-1 no-underline">{t('revue.versions.added')}</ins>{' '}
        <del className="rounded bg-danger/15 px-1 text-danger">{t('revue.versions.removed')}</del>
      </p>
      {fields.map((field) => (
        <div key={field.key} className="space-y-1">
          <p className="text-xs font-semibold uppercase text-ink-muted">
            {t(field.key === 'claims' ? 'dossiers.report.claims' : `dossiers.report.${field.key}`)}
            {!hasChanges(field.parts) && ` — ${t('revue.versions.unchanged')}`}
          </p>
          {hasChanges(field.parts) && <Diff parts={field.parts} />}
        </div>
      ))}
    </div>
  )
}

/** W6 — Revue éditoriale : rapport, affirmations et preuves, versions, décision motivée, publication signée. */
export function ReviewPage() {
  const { t, i18n } = useTranslation()
  const { id } = useParams()
  const { role, profile } = useAuth()
  const { store, team } = useCaseStore()
  const { detail } = useCase(id)
  const online = useOnlineStatus()
  const errorMessage = useCaseErrorMessage()
  const [decision, setDecision] = useState<DecisionType>('validate_publish')
  const [comment, setComment] = useState('')
  const [correction, setCorrection] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  if (detail === undefined) return <p className="py-10 text-center text-sm text-ink-muted">{t('auth.loading')}</p>
  if (detail === null) return <Card className="p-4 text-sm text-ink-muted">{t('dossiers.notFound')}</Card>

  const { case: record, report } = detail
  const names = (userId: string | null) => team.find((member) => member.id === userId)?.fullName ?? (userId ? t('dossiers.member') : '—')
  const formatDate = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  const isEditor = role === 'editor_in_chief'
  const inReview = record.status === 'to_review' || record.status === 'validated'
  const allowed = DECISION_TYPES.filter((type) => record.status === 'to_review' || type === 'validate_publish')
  const blockers = reportBlockers(detail, profile?.id ?? null)
  const choice = allowed.includes(decision) ? decision : allowed[0]
  const publishBlocked = choice === 'validate_publish' && blockers.length > 0
  const published = report?.status === 'published' && report.publicId

  const send = async (action: () => Promise<unknown>, success: string) => {
    if (!store) return false
    setBusy(true)
    setFeedback(null)
    try {
      await action()
      setFeedback({ tone: 'success', text: success })
      return true
    } catch (error) {
      setFeedback({ tone: 'error', text: errorMessage(error) })
      return false
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <Link to={`/dossiers/${record.id}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
        <ArrowLeft className="size-4" aria-hidden />
        {t('revue.backToCase')}
      </Link>

      <Card className="space-y-3 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{t('revue.title')}</p>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h2 className="font-display text-lg font-bold leading-snug text-navy dark:text-ink">{record.title}</h2>
          <CaseStatusBadge status={record.status} />
        </div>
        {record.claim && <p className="rounded-xl bg-canvas px-3 py-2 text-sm italic text-ink">« {record.claim} »</p>}
        {record.verdict ? (
          <div className="space-y-1 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={record.verdict} />
              {record.confidence && <Badge>{t('dossiers.verdict.confidence')} : {t(`confidence.${record.confidence}`)}</Badge>}
              <span className="text-xs text-ink-muted">{t('dossiers.verdict.proposedBy', { name: names(record.proposedBy) })}</span>
            </div>
            <p className="text-ink">{record.justification}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t('dossiers.verdict.none')}</p>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_340px] lg:items-start">
        <div className="min-w-0 space-y-4">
          <Card className="space-y-3 p-4">
            <SectionTitle>{t('dossiers.tab.report')}</SectionTitle>
            {!report ? (
              <p className="text-sm text-ink-muted">{t('revue.noReport')}</p>
            ) : (
              <>
                {(['summary', 'explanation', 'method'] as const).map((field) => (
                  <div key={field} className="space-y-1">
                    <p className="text-xs font-semibold uppercase text-ink-muted">{t(`dossiers.report.${field}`)}</p>
                    <p className="whitespace-pre-line text-sm text-ink">{report[field] || '—'}</p>
                  </div>
                ))}
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-ink-muted">{t('dossiers.report.claims')}</p>
                  {report.claims.length === 0 && <p className="text-sm text-danger">{t('revue.blocker.claims_missing')}</p>}
                  <ul className="space-y-2">
                    {report.claims.map((claim, index) => {
                      const supported = isSupported(claim, detail)
                      return (
                        <li key={index} className={cn('rounded-xl border p-3 text-sm', supported ? 'border-line' : 'border-danger bg-danger/5')}>
                          <p className="text-ink">{claim.text || '—'}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            {claim.evidenceIds.map((evidenceId) => {
                              const label = evidenceLabel(detail, evidenceId)
                              return label ? <Badge key={evidenceId} tone="info">{label}</Badge> : null
                            })}
                            {!supported && <Badge tone="danger">{t('revue.unsupported')}</Badge>}
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </>
            )}
          </Card>

          <Card className="space-y-2 p-4">
            <SectionTitle>{t('dossiers.tab.evidences')}</SectionTitle>
            {detail.evidences.length === 0 && <p className="text-sm text-ink-muted">{t('dossiers.evidences.none')}</p>}
            <ul className="space-y-1.5 text-sm">
              {detail.evidences.map((evidence, index) => (
                <li key={evidence.id} className="flex flex-wrap items-center gap-2">
                  <Badge tone="info">P{index + 1}</Badge>
                  <span className="text-ink">{t(`dossiers.evidenceType.${evidence.type}`)} — {evidence.origin ?? '—'}</span>
                  {report?.publicEvidenceIds.includes(evidence.id) && <Badge tone="success">{t('revue.public')}</Badge>}
                  {(evidence.archiveUrl ?? evidence.url) && (
                    <a href={(evidence.archiveUrl ?? evidence.url)!} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-1 text-xs text-cobalt hover:underline">
                      <ExternalLink className="size-3.5" aria-hidden />
                      {t('revue.openEvidence')}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="space-y-2 p-4">
            <SectionTitle>{t('dossiers.tab.checklist')} — {record.checklistDone}/{record.checklistTotal}</SectionTitle>
            <ul className="space-y-1 text-sm">
              {detail.checklist
                .filter((item) => item.state === 'todo' || item.state === 'in_progress')
                .map((item) => (
                  <li key={item.id} className="text-ink">
                    <span className="font-semibold">{t(`dossiers.question.${item.question}`)}</span> — {item.explanation || t('revue.noExplanation')}
                  </li>
                ))}
            </ul>
            {detail.checklist.every((item) => item.state === 'done' || item.state === 'not_applicable') && (
              <p className="text-sm text-success">{t('revue.checklistComplete')}</p>
            )}
          </Card>

          <Card className="space-y-3 p-4">
            <SectionTitle>
              <span className="flex items-center gap-2">
                <GitCompare className="size-4 text-cobalt" aria-hidden />
                {t('revue.versions.title')}
              </span>
            </SectionTitle>
            <VersionCompare detail={detail} />
          </Card>

          <Card className="space-y-2 p-4">
            <SectionTitle>{t('revue.decisions')}</SectionTitle>
            {detail.decisions.length === 0 && <p className="text-sm text-ink-muted">{t('revue.noDecision')}</p>}
            <ol className="space-y-2">
              {detail.decisions.map((item) => (
                <li key={item.createdAt} className="rounded-xl bg-canvas p-3 text-sm">
                  <p className="font-semibold text-ink">{t(`revue.decision.${item.type}`)}</p>
                  <p className="text-ink">{item.comment}</p>
                  <p className="text-[11px] text-ink-muted">{names(item.authorId)} · {formatDate(item.createdAt)}</p>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <aside className="space-y-4">
          {published && report?.publicId && (
            <Card className="space-y-3 border-success p-4">
              <p className="flex items-center gap-2 font-display font-bold text-success">
                <ShieldCheck className="size-5" aria-hidden />
                {t('revue.published', { id: report.publicId })}
              </p>
              <Link to={`/portail/rapports/${report.publicId}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
                <ExternalLink className="size-4" aria-hidden />
                {t('revue.openPublic')}
              </Link>
              <div className="flex justify-center">
                <QrImage value={verifyUrl(report.publicId)} label={t('portail.report.qrLabel', { id: report.publicId })} size={140} />
              </div>
              <SharePanel
                title={t('portail.share.title', { verdict: t(`verdict.${record.verdict ?? 'unverifiable'}`), title: record.title })}
                description={report.summary}
                url={reportUrl(report.publicId)}
              />
              {report.signature && <p className="break-all font-mono text-[11px] text-ink-muted">{t('revue.signature')} : {report.signature.slice(0, 32)}…</p>}
            </Card>
          )}

          {isEditor && inReview && (
            <Card className="p-4">
              <form
                className="space-y-3"
                onSubmit={async (event) => {
                  event.preventDefault()
                  const ok = await send(
                    () => store!.decide({ kind: 'editorial_decision', caseId: record.id, decision: choice, comment }),
                    t(`revue.done.${choice}`),
                  )
                  if (ok) setComment('')
                }}
              >
                <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
                  <Gavel className="size-4 text-cobalt" aria-hidden />
                  {t('revue.decide')}
                </p>
                <fieldset className="min-w-0 space-y-1.5">
                  <legend className="sr-only">{t('revue.decide')}</legend>
                  {allowed.map((type) => (
                    <label key={type} className={cn('flex min-h-11 cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-sm', choice === type ? 'border-cobalt bg-cobalt/5' : 'border-line')}>
                      <input type="radio" name="decision" className="mt-1" checked={choice === type} onChange={() => setDecision(type)} />
                      <span>
                        <span className="block font-semibold text-ink">{t(`revue.decision.${type}`)}</span>
                        <span className="block text-xs text-ink-muted">{t(`revue.decisionHint.${type}`)}</span>
                      </span>
                    </label>
                  ))}
                </fieldset>
                {choice === 'validate_publish' && (
                  <ul className="space-y-1 rounded-xl bg-canvas p-3 text-xs" aria-label={t('revue.conditions')}>
                    {PUBLICATION_BLOCKERS.filter((blocker) => blocker !== 'report_missing' || !report).map((blocker) => {
                      const ok = !blockers.includes(blocker)
                      const Icon = ok ? CircleCheck : CircleX
                      return (
                        <li key={blocker} className={cn('flex items-start gap-1.5', ok ? 'text-success' : 'text-danger')}>
                          <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                          {t(`revue.condition.${blocker}`)}
                        </li>
                      )
                    })}
                  </ul>
                )}
                <div className="space-y-1.5">
                  <label htmlFor="decision-comment" className="text-sm font-semibold text-ink">{t('revue.comment')}</label>
                  <Textarea id="decision-comment" rows={3} required value={comment} onChange={(event) => setComment(event.target.value)} placeholder={t('revue.commentHint')} />
                </div>
                {!online && store?.mode === 'remote' && <p className="text-xs text-danger">{t('revue.onlineRequired')}</p>}
                {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
                <Button type="submit" block disabled={busy || publishBlocked || !comment.trim() || (!online && store?.mode === 'remote')}>
                  <Gavel className="size-4" aria-hidden />
                  {busy ? t('revue.sending') : t(`revue.submit.${choice}`)}
                </Button>
              </form>
            </Card>
          )}

          {isEditor && published && (
            <Card className="p-4">
              <form
                className="space-y-2"
                onSubmit={async (event) => {
                  event.preventDefault()
                  if (await send(() => store!.decide({ kind: 'add_correction', caseId: record.id, text: correction }), t('revue.correctionAdded'))) setCorrection('')
                }}
              >
                <label htmlFor="correction" className="font-display text-sm font-bold text-navy dark:text-ink">{t('revue.correction')}</label>
                <p className="text-xs text-ink-muted">{t('revue.correctionHint')}</p>
                <Textarea id="correction" rows={2} required value={correction} onChange={(event) => setCorrection(event.target.value)} />
                <Button type="submit" variant="secondary" block disabled={busy || !correction.trim()}>{t('revue.addCorrection')}</Button>
              </form>
            </Card>
          )}

          {!isEditor && inReview && <Card className="p-4 text-sm text-ink-muted">{t('revue.editorOnly')}</Card>}
          {!inReview && !published && <Card className="p-4 text-sm text-ink-muted">{t('revue.notInReview')}</Card>}
          {feedback && !(isEditor && inReview) && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
        </aside>
      </div>
    </div>
  )
}
