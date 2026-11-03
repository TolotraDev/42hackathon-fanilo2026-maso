import { CircleCheck, CircleX, ExternalLink, Gavel, RotateCcw, Send } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge, Button, Card, SectionTitle, Textarea, VerdictBadge } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { canTransition } from '@/lib/workflow'
import { cn } from '@/lib/cn'
import { CONFIDENCE_LEVELS, VERDICTS, type CaseStatus, type ConfidenceLevel, type Verdict } from '@/types/domain'
import { latestAutoReport } from './analysisReport'
import { useCaseAction } from './CasePage'
import type { CaseDetail } from './model'
import { IN_REVIEW, STATUS_ACTIONS_IN_CASE, verdictBlockers } from './rules'

const SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'

/** Décision : changements de statut motivés (section 6) et verdict proposé (section 11.1). */
export function DecisionPanel({ detail, names }: { detail: CaseDetail; names: (id: string | null) => string }) {
  const { t } = useTranslation()
  const { role, profile } = useAuth()
  const { run, feedback } = useCaseAction()
  const [action, setAction] = useState<CaseStatus | null>(null)
  const [reason, setReason] = useState('')
  const [form, setForm] = useState<{ verdict: Verdict; confidence: ConfidenceLevel; justification: string; evidenceIds: string[] }>({
    verdict: detail.case.verdict ?? 'unverifiable',
    confidence: detail.case.confidence ?? 'medium',
    justification: detail.case.justification ?? '',
    evidenceIds: detail.case.justificationEvidenceIds,
  })
  const { case: record } = detail
  const label = (id: string) => `P${detail.evidences.findIndex((evidence) => evidence.id === id) + 1}`

  const inReview = IN_REVIEW.includes(record.status)
  const actions = inReview ? [] : STATUS_ACTIONS_IN_CASE.filter((to) => to !== 'to_review' && canTransition(record.status, to, role))
  const canPropose = (role === 'fact_checker' || role === 'editor_in_chief') && ['in_analysis', 'correction_requested', 'to_verify'].includes(record.status)
  // Le fact-checker renvoie l'analyse au journaliste, avec un motif.
  const canSendBack = record.status === 'to_verify' && canTransition('to_verify', 'correction_requested', role)
  const [redo, setRedo] = useState('')
  const analysisReport = latestAutoReport(detail)
  const blockers = verdictBlockers(detail, form.evidenceIds)

  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <SectionTitle>{t('dossiers.verdict.title')}</SectionTitle>
        {record.verdict ? (
          <div className="space-y-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <VerdictBadge verdict={record.verdict} />
              {record.confidence && <Badge>{t('dossiers.verdict.confidence')} : {t(`confidence.${record.confidence}`)}</Badge>}
            </div>
            <p className="text-ink">{record.justification}</p>
            <p className="text-xs text-ink-muted">
              {t('dossiers.verdict.cites')} : {record.justificationEvidenceIds.map(label).join(', ') || '—'} · {t('dossiers.verdict.proposedBy', { name: names(record.proposedBy) })}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-muted">{t('dossiers.verdict.none')}</p>
        )}
        {record.proposedBy === profile?.id && record.status === 'to_review' && (
          <p className="text-xs text-ink-muted">{t('dossiers.verdict.selfValidation')}</p>
        )}
      </Card>

      {(inReview || record.status === 'published') && (
        <Card className="space-y-2 p-4">
          <SectionTitle>{t('revue.title')}</SectionTitle>
          <p className="text-xs text-ink-muted">
            {record.status === 'published' ? t('revue.panel.published') : role === 'editor_in_chief' ? t('revue.panel.editor') : t('revue.panel.team')}
          </p>
          <Link
            to={`/dossiers/${record.id}/revue`}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cobalt px-4 text-sm font-semibold text-white hover:brightness-110"
          >
            <Gavel className="size-4" aria-hidden />
            {t('revue.open')}
          </Link>
          {detail.report?.publicId && (
            <Link to={`/portail/rapports/${detail.report.publicId}`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-cobalt hover:underline">
              <ExternalLink className="size-4" aria-hidden />
              {t('revue.openPublic')} ({detail.report.publicId})
            </Link>
          )}
        </Card>
      )}

      {record.status === 'to_verify' && (
        <Card className="space-y-1 border-l-4 border-l-warning p-4">
          <p className="font-display text-sm font-bold text-navy dark:text-ink">{t('dossiers.toVerify.title')}</p>
          <p className="text-xs text-ink-muted">{canPropose ? t('dossiers.toVerify.checker', { label: analysisReport?.label ?? '—' }) : t('dossiers.toVerify.waiting')}</p>
        </Card>
      )}

      {canSendBack && (
        <Card className="p-4">
          <form
            className="space-y-2"
            onSubmit={async (event) => {
              event.preventDefault()
              if (await run({ kind: 'change_status', caseId: record.id, to: 'correction_requested', reason: redo }, t('dossiers.toVerify.sentBack'))) setRedo('')
            }}
          >
            <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
              <RotateCcw className="size-4 text-danger" aria-hidden />
              {t('dossiers.toVerify.redo')}
            </p>
            <label htmlFor="redo-reason" className="text-xs text-ink-muted">{t('dossiers.toVerify.redoHint')}</label>
            <Textarea id="redo-reason" rows={3} required value={redo} onChange={(event) => setRedo(event.target.value)} placeholder={t('dossiers.toVerify.redoPlaceholder')} />
            <Button type="submit" variant="secondary" block disabled={!redo.trim()}>
              <RotateCcw className="size-4" aria-hidden />
              {t('dossiers.toVerify.sendBack')}
            </Button>
          </form>
        </Card>
      )}

      {canPropose && (
        <Card className="p-4">
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void run({ kind: 'propose_verdict', caseId: record.id, ...form }, t('dossiers.verdict.proposed'))
            }}
          >
            <p className="flex items-center gap-2 font-display text-sm font-bold text-navy dark:text-ink">
              <Gavel className="size-4 text-cobalt" aria-hidden />
              {t('dossiers.verdict.propose')}
            </p>
            {record.status === 'to_verify' && <p className="text-xs text-ink-muted">{t('dossiers.toVerify.proposeHint')}</p>}
            <div className="space-y-1.5">
              <label htmlFor="verdict" className="text-sm font-semibold text-ink">{t('dossiers.verdict.label')}</label>
              <select id="verdict" className={SELECT} value={form.verdict} onChange={(event) => setForm({ ...form, verdict: event.target.value as Verdict })}>
                {VERDICTS.map((verdict) => (
                  <option key={verdict} value={verdict}>{t(`verdict.${verdict}`)}</option>
                ))}
              </select>
              <p className="text-xs text-ink-muted">{t(`verdictDefinition.${form.verdict}`)}</p>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confidence" className="text-sm font-semibold text-ink">{t('dossiers.verdict.confidence')}</label>
              <select id="confidence" className={SELECT} value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value as ConfidenceLevel })}>
                {CONFIDENCE_LEVELS.map((level) => (
                  <option key={level} value={level}>{t(`confidence.${level}`)}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label htmlFor="justification" className="text-sm font-semibold text-ink">{t('dossiers.verdict.justification')}</label>
              <Textarea id="justification" rows={4} value={form.justification} onChange={(event) => setForm({ ...form, justification: event.target.value })} placeholder={t('dossiers.verdict.justificationHint')} />
            </div>
            <fieldset className="min-w-0 space-y-1">
              <legend className="text-sm font-semibold text-ink">{t('dossiers.verdict.cites')}</legend>
              {detail.evidences.length === 0 && <p className="text-xs text-ink-muted">{t('dossiers.evidences.none')}</p>}
              {detail.evidences.map((evidence, index) => (
                <label key={evidence.id} className="flex min-h-9 items-center gap-2 text-xs text-ink">
                  <input
                    type="checkbox"
                    checked={form.evidenceIds.includes(evidence.id)}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        evidenceIds: event.target.checked ? [...form.evidenceIds, evidence.id] : form.evidenceIds.filter((id) => id !== evidence.id),
                      })
                    }
                  />
                  <span className="truncate">[P{index + 1}] {t(`dossiers.evidenceType.${evidence.type}`)} — {evidence.origin ?? evidence.url ?? ''}</span>
                </label>
              ))}
            </fieldset>
            <ul className="space-y-1 rounded-xl bg-canvas p-3 text-xs" aria-label={t('dossiers.verdict.conditions')}>
              {(['claim_missing', 'source_missing', 'evidence_missing', 'checklist_unjustified'] as const).map((blocker) => {
                const ok = !blockers.includes(blocker)
                const Icon = ok ? CircleCheck : CircleX
                return (
                  <li key={blocker} className={cn('flex items-start gap-1.5', ok ? 'text-success' : 'text-danger')}>
                    <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                    {t(`dossiers.condition.${blocker}`)}
                  </li>
                )
              })}
            </ul>
            <Button type="submit" block disabled={blockers.length > 0}>
              <Send className="size-4" aria-hidden />
              {t('dossiers.verdict.submit')}
            </Button>
          </form>
        </Card>
      )}

      {actions.length > 0 && (
        <Card className="space-y-2 p-4">
          <SectionTitle>{t('dossiers.status.title')}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {actions.map((to) => (
              <Button key={to} variant={action === to ? 'primary' : 'secondary'} className="min-h-10 text-xs" onClick={() => setAction(action === to ? null : to)}>
                {t(`dossiers.status.to.${to}`)}
              </Button>
            ))}
          </div>
          {action && (
            <form
              className="space-y-2"
              onSubmit={async (event) => {
                event.preventDefault()
                if (await run({ kind: 'change_status', caseId: record.id, to: action, reason }, t('dossiers.status.changed'))) {
                  setAction(null)
                  setReason('')
                }
              }}
            >
              <Textarea rows={2} required aria-label={t('dossiers.status.reason')} placeholder={t('dossiers.status.reason')} value={reason} onChange={(event) => setReason(event.target.value)} />
              <Button type="submit" block>{t('dossiers.status.confirm', { status: t(`caseStatus.${action}`) })}</Button>
            </form>
          )}
        </Card>
      )}
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
    </div>
  )
}
