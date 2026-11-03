import { ChevronDown, CircleAlert, CircleCheck, ExternalLink, FileDown, Info, LoaderCircle, Send, TriangleAlert, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Button, Card, SectionTitle, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { ImageAnalysisView, type AnalysisOutcome } from '@/features/verifier/ImageAnalysisPage'
import { LinkAnalysisView } from '@/features/verifier/LinkAnalysisPage'
import { TextAnalysisView } from '@/features/verifier/TextAnalysisPage'
import { signedEvidenceUrl } from '@/features/verifier/verificationApi'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import type { FindingLevel, Vigilance } from '@/lib/analysis/synthesis'
import { cn } from '@/lib/cn'
import { canTransition } from '@/lib/workflow'
import type { Tone } from '@/types/domain'
import { analysisItem, analysisTargets, autoReportSections, buildAutoReport, latestAutoReport, type AnalysisItem, type AnalysisTarget, type AutoReport } from './analysisReport'
import { useCaseAction } from './CasePage'
import { useCaseStore } from './CaseStoreProvider'
import { casePdf } from './exportCase'
import type { CaseDetail, EvidenceRecord } from './model'

const VIGILANCE_TONES: Record<Vigilance, Tone> = { high: 'danger', medium: 'warning', low: 'success' }
const LEVEL_ICONS: Record<FindingLevel, LucideIcon> = { alert: CircleAlert, caution: TriangleAlert, ok: CircleCheck, info: Info }
const LEVEL_COLORS: Record<FindingLevel, string> = { alert: 'text-danger', caution: 'text-warning', ok: 'text-success', info: 'text-ink-muted' }
/** Statuts où le journaliste (re)fait l'analyse et la soumet au fact-checker. */
const LIVE_STATUSES = ['in_analysis', 'correction_requested']

/** Fichier d'une preuve image : sur l'appareil, ou téléchargé depuis le stockage de la rédaction. */
function useEvidenceFile(evidence: EvidenceRecord | null) {
  const { store } = useCaseStore()
  const online = useOnlineStatus()
  const [file, setFile] = useState<File | null | 'error'>(null)
  // Dépend de l'identité de la preuve, pas de l'objet (recréé à chaque mise à jour du dossier) :
  // sinon l'image serait rechargée et réanalysée à chaque modification.
  const id = evidence?.id
  const localBlobId = evidence?.localBlobId
  const storagePath = evidence?.storagePath
  useEffect(() => {
    if (!id) return
    let cancelled = false
    void (async () => {
      try {
        let blob: Blob | undefined
        if (localBlobId && store) blob = await store.readBlob(localBlobId)
        if (!blob && storagePath && online) blob = await fetch(await signedEvidenceUrl(storagePath)).then((response) => response.blob())
        if (!cancelled && blob) setFile(new File([blob], storagePath?.split('/').pop() ?? `${id}.jpg`, { type: blob.type }))
        else if (!cancelled && (online || !storagePath)) setFile('error')
      } catch {
        if (!cancelled) setFile('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [id, localBlobId, storagePath, store, online])
  return file
}

function ImageTarget({ evidence, caseId, onDone }: { evidence: EvidenceRecord; caseId: string; onDone: (outcome: AnalysisOutcome) => void }) {
  const { t } = useTranslation()
  const file = useEvidenceFile(evidence)
  const { url, origin } = evidence
  const media = useMemo(() => (file && file !== 'error' ? { file, sourceUrl: url, origin } : null), [file, url, origin])
  if (file === 'error') return <p className="text-sm text-danger">{t('dossiers.analysis.fileUnavailable')}</p>
  if (!media) return <p className="text-sm text-ink-muted">{t('auth.loading')}</p>
  return <ImageAnalysisView media={media} embedded caseId={caseId} onDone={onDone} />
}

/** Un élément analysé, en direct (vue complète comme dans « Vérifier »), repliable. */
function LiveTarget({ label, target, evidence, claim, caseId, onDone }: { label: string; target: AnalysisTarget; evidence: EvidenceRecord | null; claim: string; caseId: string; onDone: (outcome: AnalysisOutcome) => void }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(true)
  return (
    <Card className="p-3">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-10 w-full items-center justify-between gap-2 text-left">
        <span className="font-display text-sm font-bold text-navy dark:text-ink">{label}</span>
        <ChevronDown className={cn('size-4 shrink-0 text-ink-muted transition', open && 'rotate-180')} aria-hidden />
      </button>
      {/* Repliée, l'analyse continue : seul l'affichage est masqué. */}
      <div className={cn('pt-3', !open && 'hidden')}>
        {target === 'image' && evidence && <ImageTarget evidence={evidence} caseId={caseId} onDone={onDone} />}
        {target === 'link' && evidence?.url && <LinkAnalysisView url={evidence.url} embedded onDone={onDone} />}
        {target === 'text' && <TextAnalysisView text={claim} embedded onDone={onDone} />}
        <p className="sr-only">{t(`dossiers.analysis.target.${target}`)}</p>
      </div>
    </Card>
  )
}

/** Rapport enregistré : lisible par le fact-checker et le rédacteur en chef, exportable en PDF. */
export function SavedReport({ report, label }: { report: AutoReport; label: string }) {
  const { t, i18n } = useTranslation()
  const date = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(report.generated_at))
  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <SectionTitle>{t('dossiers.analysis.savedTitle', { label })}</SectionTitle>
          <Badge tone={VIGILANCE_TONES[report.vigilance]} solid>{t(`synthesis.vigilance.${report.vigilance}`)}</Badge>
        </div>
        <p className="text-xs text-ink-muted">{t('dossiers.analysis.savedAt', { date })}</p>
        {report.note && (
          <p className="rounded-xl bg-canvas px-3 py-2 text-sm text-ink">
            <span className="font-semibold">{t('dossiers.analysis.note')} : </span>
            {report.note}
          </p>
        )}
      </Card>
      {report.items.map((item, index) => (
        <ItemCard key={`${item.label}-${index}`} item={item} />
      ))}
      <p className="text-xs text-ink-muted">{t('synthesis.human')}</p>
    </div>
  )
}

function ItemCard({ item }: { item: AnalysisItem }) {
  const { t } = useTranslation()
  return (
    <Card className="space-y-2 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-display text-sm font-bold text-navy dark:text-ink">{item.label}</p>
        <Badge tone={VIGILANCE_TONES[item.vigilance]}>{t(`synthesis.vigilance.${item.vigilance}`)}</Badge>
      </div>
      <ul className="space-y-1.5">
        {item.findings.map((finding, index) => {
          const Icon = LEVEL_ICONS[finding.level]
          return (
            <li key={index} className="flex items-start gap-2 text-sm">
              <Icon className={cn('mt-0.5 size-4 shrink-0', LEVEL_COLORS[finding.level])} aria-label={t(`synthesis.level.${finding.level}`)} />
              <span className="min-w-0 text-ink">
                {finding.text}
                {finding.source && (
                  <span className="text-xs text-ink-muted">
                    {' '}— {t('synthesis.source')} :{' '}
                    {finding.sourceUrl ? <a href={finding.sourceUrl} target="_blank" rel="noreferrer noopener" className="text-cobalt hover:underline">{finding.source}</a> : finding.source}
                  </span>
                )}
              </span>
            </li>
          )
        })}
      </ul>
      {item.claims.length > 0 && (
        <div className="space-y-1.5 rounded-xl bg-canvas p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">{t('synthesis.alreadyChecked', { count: item.claims.length })}</p>
          {item.claims.map((claim, index) => (
            <p key={index} className="text-xs text-ink">
              <span className="font-semibold">{[claim.publisher, claim.rating].filter(Boolean).join(' — ')}</span> {claim.text && `« ${claim.text} »`}{' '}
              {claim.url && (
                <a href={claim.url} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-0.5 font-semibold text-cobalt hover:underline">
                  <ExternalLink className="size-3" aria-hidden />
                  {t('synthesis.readCheck')}
                </a>
              )}
            </p>
          ))}
        </div>
      )}
    </Card>
  )
}

async function downloadPdf(title: string, report: AutoReport, t: ReturnType<typeof useTranslation>['t'], claim: string, footer: string, fileName: string) {
  const blob = await casePdf(title, autoReportSections(report, t, claim), footer)
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = fileName
  link.click()
  URL.revokeObjectURL(link.href)
}

/**
 * Onglet « Analyse » : à la mise en analyse, chaque preuve (image, lien) et l'affirmation sont analysées comme
 * dans « Vérifier ». Le journaliste relit, puis valide (le rapport est enregistré et part au fact-checker)
 * ou l'exporte en PDF. Ensuite, le rapport enregistré reste consultable par toute l'équipe.
 */
export function AnalysisTab({ detail }: { detail: CaseDetail }) {
  const { t, i18n } = useTranslation()
  const { role } = useAuth()
  const { store } = useCaseStore()
  const { run, feedback, setFeedback } = useCaseAction()
  const record = detail.case
  const saved = latestAutoReport(detail)
  const live = LIVE_STATUSES.includes(record.status) && canTransition(record.status, 'to_verify', role)
  // Les preuves « analysis » (rapports enregistrés) ne sont pas réanalysées.
  const targets = useMemo(() => analysisTargets(detail), [detail])
  const [outcomes, setOutcomes] = useState<Record<string, AnalysisItem>>({})
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const done = targets.length > 0 && targets.every((target) => outcomes[target.key])
  const label = (target: (typeof targets)[number]) =>
    target.target === 'text' ? t('dossiers.analysis.claimLabel') : `P${(target.index ?? 0) + 1} — ${t(`dossiers.evidenceType.${target.evidence?.type ?? 'image'}`)}`
  const handle = useCallback(
    (target: (typeof targets)[number], text: string) => (outcome: AnalysisOutcome) =>
      setOutcomes((current) => ({ ...current, [target.key]: analysisItem(t, { evidenceId: target.evidence?.id ?? null, target: target.target, label: text }, outcome) })),
    [t],
  )
  const handlers = useMemo(() => Object.fromEntries(targets.map((target) => [target.key, handle(target, label(target))])), [targets, handle]) // eslint-disable-line react-hooks/exhaustive-deps
  const draft = done ? buildAutoReport(targets.map((target) => outcomes[target.key]), note, new Date().toISOString()) : null
  const formatDate = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
  const footer = t('dossiers.analysis.pdfFooter', { date: formatDate(new Date().toISOString()), status: t(`caseStatus.${record.status}`) })
  const pdfName = `MASO-analyse-${record.id.slice(0, 8)}.pdf`
  const lastReason = [...detail.history].reverse().find((entry) => entry.toStatus === 'correction_requested')?.reason

  const submit = async () => {
    if (!draft || !store) return
    setBusy(true)
    setFeedback(null)
    try {
      const evidence: EvidenceRecord = {
        id: crypto.randomUUID(),
        type: 'analysis',
        url: null,
        archiveUrl: null,
        storagePath: null,
        sha256: null,
        phash: null,
        origin: t('dossiers.analysis.origin'),
        analysis: draft as unknown as Record<string, unknown>,
        addedBy: null,
        createdAt: new Date().toISOString(),
      }
      await store.mutate({ kind: 'add_evidence', caseId: record.id, evidence })
      await run({ kind: 'change_status', caseId: record.id, to: 'to_verify', reason: note.trim() || t('dossiers.analysis.defaultReason') }, t('dossiers.analysis.submitted'))
    } catch {
      setFeedback({ tone: 'error', text: t('dossiers.analysis.submitFailed') })
    } finally {
      setBusy(false)
    }
  }

  if (!live) {
    if (!saved) return <Card className="p-4 text-sm text-ink-muted">{record.status === 'new' ? t('dossiers.analysis.startHint') : t('dossiers.analysis.none')}</Card>
    return (
      <div className="space-y-3">
        <SavedReport report={saved.report} label={saved.label} />
        <Button variant="secondary" className="min-h-10 text-xs" onClick={() => void downloadPdf(t('dossiers.analysis.pdfTitle', { title: record.title }), saved.report, t, record.claim, footer, pdfName)}>
          <FileDown className="size-4" aria-hidden />
          {t('dossiers.analysis.exportPdf')}
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {record.status === 'correction_requested' && lastReason && (
        <Card className="border-l-4 border-l-danger p-4" role="alert">
          <p className="text-sm font-bold text-danger">{t('dossiers.analysis.redoTitle')}</p>
          <p className="mt-1 text-sm text-ink">{lastReason}</p>
        </Card>
      )}
      <Card className="space-y-1 p-4">
        <SectionTitle>{t('dossiers.analysis.liveTitle')}</SectionTitle>
        <p className="text-sm text-ink-muted">{t('dossiers.analysis.liveHint')}</p>
      </Card>
      {targets.length === 0 && <Card className="p-4 text-sm text-ink-muted">{t('dossiers.analysis.nothing')}</Card>}
      {targets.map((target) => (
        <LiveTarget key={target.key} label={label(target)} target={target.target} evidence={target.evidence} claim={record.claim} caseId={record.id} onDone={handlers[target.key]} />
      ))}

      {targets.length > 0 && (
        <Card className="space-y-3 p-4">
          <SectionTitle>{t('dossiers.analysis.validateTitle')}</SectionTitle>
          {!done && (
            <p className="flex items-center gap-2 text-sm text-ink-muted" role="status">
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
              {t('dossiers.analysis.waiting', { done: Object.keys(outcomes).filter((key) => targets.some((target) => target.key === key)).length, total: targets.length })}
            </p>
          )}
          {draft && (
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
              {t('dossiers.analysis.overall')} : <Badge tone={VIGILANCE_TONES[draft.vigilance]} solid>{t(`synthesis.vigilance.${draft.vigilance}`)}</Badge>
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="analysis-note" className="text-sm font-semibold text-ink">{t('dossiers.analysis.noteLabel')}</label>
            <Textarea id="analysis-note" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder={t('dossiers.analysis.notePlaceholder')} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button className="sm:flex-1" disabled={!draft || busy} onClick={() => void submit()}>
              <Send className="size-4" aria-hidden />
              {busy ? t('auth.loading') : t('dossiers.analysis.validate')}
            </Button>
            <Button variant="secondary" disabled={!draft} onClick={() => draft && void downloadPdf(t('dossiers.analysis.pdfTitle', { title: record.title }), draft, t, record.claim, footer, pdfName)}>
              <FileDown className="size-4" aria-hidden />
              {t('dossiers.analysis.exportPdf')}
            </Button>
          </div>
          <p className="text-xs text-ink-muted">{t('dossiers.analysis.validateHint')}</p>
          {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
        </Card>
      )}
    </div>
  )
}
