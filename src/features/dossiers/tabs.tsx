import { AtSign, Columns2, ExternalLink, FileText, Image as ImageIcon, Link2, Plus, Save, Scale, Search, Trash2, Video } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Avatar, Badge, Button, Card, CaseStatusBadge, Input, SectionTitle, Textarea } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { FormMessage } from '@/features/auth/FormMessage'
import { listSources } from '@/features/ressources/resourcesApi'
import type { SourceSummary } from '@/features/ressources/types'
import { useDirectory } from '@/features/ressources/useResources'
import { signedEvidenceUrl } from '@/features/verifier/verificationApi'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { normalizeUrl } from '@/lib/analysis/url'
import { cn } from '@/lib/cn'
import { loadWithPack } from '@/lib/offlineCache'
import { matchesQuery } from '@/lib/text'
import { CHECKLIST_BLOCKS, CHECKLIST_STATES, LANGUAGES, type ChecklistState, type Language } from '@/types/domain'
import { useCaseAction } from './CasePage'
import { useCaseStore } from './CaseStoreProvider'
import type { CaseDetail, CasePatch, ChecklistItem, EvidenceRecord, ReportClaim } from './model'

const SELECT = 'min-h-11 w-full rounded-xl border border-line bg-canvas px-3 text-sm text-ink focus:border-cobalt focus:outline-none'
const locked = (detail: CaseDetail) => ['validated', 'published', 'closed'].includes(detail.case.status)

function Locked() {
  const { t } = useTranslation()
  return <p className="rounded-xl bg-canvas px-3 py-2 text-xs text-ink-muted">{t('dossiers.lockedHint')}</p>
}

// ─── Résumé ─────────────────────────────────────────────────────────────────

export function SummaryTab({ detail }: { detail: CaseDetail }) {
  const { t } = useTranslation()
  const { team } = useCaseStore()
  const { role } = useAuth()
  const { run, feedback } = useCaseAction()
  const record = detail.case
  const [form, setForm] = useState<Required<CasePatch>>({
    title: record.title,
    claim: record.claim,
    category: record.category ?? '',
    region: record.region ?? '',
    priority: record.priority,
    dueDate: record.dueDate,
    assignedTo: record.assignedTo,
  })
  const factCheckers = team.filter((member) => member.role === 'fact_checker' || member.role === 'editor_in_chief')

  if (locked(detail)) {
    return (
      <Card className="space-y-2 p-4 text-sm">
        <Locked />
        <p><span className="text-ink-muted">{t('dossiers.field.category')} :</span> {record.category ?? '—'}</p>
        <p><span className="text-ink-muted">{t('dossiers.field.region')} :</span> {record.region ?? '—'}</p>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <form
        className="space-y-3"
        onSubmit={(event) => {
          event.preventDefault()
          void run({ kind: 'update_case', caseId: record.id, patch: { ...form, category: form.category || null, region: form.region || null } }, t('dossiers.saved'))
        }}
      >
        <div className="space-y-1.5">
          <label htmlFor="summary-title" className="text-sm font-semibold text-ink">{t('verifier.attach.caseTitle')}</label>
          <Input id="summary-title" required value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="summary-claim" className="text-sm font-semibold text-ink">{t('dossiers.field.claim')}</label>
          <Textarea id="summary-claim" rows={3} value={form.claim} onChange={(event) => setForm({ ...form, claim: event.target.value })} placeholder={t('dossiers.field.claimPlaceholder')} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="summary-category" className="text-sm font-semibold text-ink">{t('dossiers.field.category')}</label>
            <Input id="summary-category" value={form.category ?? ''} onChange={(event) => setForm({ ...form, category: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="summary-region" className="text-sm font-semibold text-ink">{t('dossiers.field.region')}</label>
            <Input id="summary-region" value={form.region ?? ''} onChange={(event) => setForm({ ...form, region: event.target.value })} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="summary-priority" className="text-sm font-semibold text-ink">{t('dossiers.field.priority')}</label>
            <select id="summary-priority" className={SELECT} value={form.priority} onChange={(event) => setForm({ ...form, priority: Number(event.target.value) as 1 | 2 | 3 })}>
              {[1, 2, 3].map((priority) => (
                <option key={priority} value={priority}>{t(`dossiers.priority.${priority}`)}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="summary-due" className="text-sm font-semibold text-ink">{t('dossiers.field.dueDate')}</label>
            <Input id="summary-due" type="date" value={form.dueDate ?? ''} onChange={(event) => setForm({ ...form, dueDate: event.target.value || null })} />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="summary-assignee" className="text-sm font-semibold text-ink">{t('dossiers.field.assignee')}</label>
          <select id="summary-assignee" className={SELECT} value={form.assignedTo ?? ''} onChange={(event) => setForm({ ...form, assignedTo: event.target.value || null })}>
            <option value="">{t('dossiers.unassigned')}</option>
            {team.filter((member) => member.role !== 'admin').map((member) => (
              <option key={member.id} value={member.id}>{member.fullName} — {t(`role.${member.role}`)}</option>
            ))}
          </select>
          {role === 'journalist' && factCheckers.length > 0 && <p className="text-xs text-ink-muted">{t('dossiers.submitToFactChecker')}</p>}
        </div>
        {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
        <Button type="submit" block>
          <Save className="size-4" aria-hidden />
          {t('dossiers.save')}
        </Button>
      </form>
    </Card>
  )
}

// ─── Preuves (et comparaison côte à côte, W5) ───────────────────────────────

const EVIDENCE_ICONS = { image: ImageIcon, screenshot: ImageIcon, video: Video, link: Link2, document: FileText, text: FileText, analysis: Scale }

function useEvidenceImage(evidence: EvidenceRecord) {
  const { store } = useCaseStore()
  const online = useOnlineStatus()
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (evidence.type !== 'image' && evidence.type !== 'screenshot') return
    let objectUrl: string | null = null
    let cancelled = false
    void (async () => {
      if (evidence.localBlobId && store) {
        const blob = await store.readBlob(evidence.localBlobId)
        if (blob && !cancelled) setUrl((objectUrl = URL.createObjectURL(blob)))
      } else if (evidence.storagePath && online) {
        const signed = await signedEvidenceUrl(evidence.storagePath).catch(() => null)
        if (signed && !cancelled) setUrl(signed)
      }
    })()
    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [evidence, store, online])
  return url
}

function EvidenceThumb({ evidence, className }: { evidence: EvidenceRecord; className?: string }) {
  const { t } = useTranslation()
  const url = useEvidenceImage(evidence)
  const Icon = EVIDENCE_ICONS[evidence.type]
  return url ? (
    <img src={url} alt={evidence.origin ?? t(`dossiers.evidenceType.${evidence.type}`)} className={cn('rounded-xl bg-canvas object-contain', className)} />
  ) : (
    <span className={cn('flex items-center justify-center rounded-xl bg-cobalt/10 text-cobalt', className)}>
      <Icon className="size-6" aria-hidden />
    </span>
  )
}

export function EvidencesTab({ detail }: { detail: CaseDetail }) {
  const { t, i18n } = useTranslation()
  const { run, feedback } = useCaseAction()
  const [compare, setCompare] = useState<string[]>([])
  const [link, setLink] = useState({ url: '', origin: '' })
  const formatDate = (iso: string) => new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' }).format(new Date(iso))
  const images = detail.evidences.filter((evidence) => evidence.type === 'image' || evidence.type === 'screenshot')

  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-4">
        <SectionTitle>{t('dossiers.evidences.add')}</SectionTitle>
        <p className="text-xs text-ink-muted">{t('dossiers.evidences.addHint')}</p>
        <div className="flex flex-wrap gap-2">
          {(['image', 'video', 'lien'] as const).map((kind) => (
            <Link key={kind} to={`/verifier${kind === 'lien' ? '/lien' : `/${kind}`}`} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line px-3 text-xs font-semibold text-cobalt hover:bg-canvas">
              {t(`dossiers.evidences.analyse.${kind}`)}
            </Link>
          ))}
        </div>
        {!locked(detail) && (
          <form
            className="flex flex-col gap-2 sm:flex-row"
            onSubmit={async (event) => {
              event.preventDefault()
              const url = normalizeUrl(link.url)
              if (!url) return
              const ok = await run(
                {
                  kind: 'add_evidence',
                  caseId: detail.case.id,
                  evidence: { id: crypto.randomUUID(), type: 'link', url, archiveUrl: null, storagePath: null, sha256: null, phash: null, origin: link.origin.trim() || null, analysis: null, addedBy: null, createdAt: new Date().toISOString() },
                },
                t('dossiers.evidences.added'),
              )
              if (ok) setLink({ url: '', origin: '' })
            }}
          >
            <Input aria-label={t('dossiers.evidences.linkUrl')} placeholder={t('dossiers.evidences.linkUrl')} inputMode="url" required value={link.url} onChange={(event) => setLink({ ...link, url: event.target.value })} />
            <Input aria-label={t('verifier.attach.origin')} placeholder={t('verifier.attach.origin')} value={link.origin} onChange={(event) => setLink({ ...link, origin: event.target.value })} />
            <Button type="submit" variant="secondary" className="shrink-0">{t('dossiers.evidences.addLink')}</Button>
          </form>
        )}
        {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
      </Card>

      {compare.length === 2 && (
        <Card className="space-y-2 p-4">
          <div className="flex items-center justify-between">
            <SectionTitle>{t('dossiers.evidences.comparison')}</SectionTitle>
            <button type="button" className="min-h-9 text-xs font-semibold text-cobalt" onClick={() => setCompare([])}>{t('nav.closeSearch')}</button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {compare.map((id) => {
              const evidence = detail.evidences.find((item) => item.id === id)!
              return (
                <figure key={id} className="space-y-1">
                  <EvidenceThumb evidence={evidence} className="aspect-square w-full" />
                  <figcaption className="truncate text-[11px] text-ink-muted">[P{detail.evidences.indexOf(evidence) + 1}] {evidence.origin}</figcaption>
                </figure>
              )
            })}
          </div>
        </Card>
      )}

      {detail.evidences.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">{t('dossiers.evidences.none')}</p>}
      <ul className="space-y-2">
        {detail.evidences.map((evidence, index) => {
          const isImage = images.includes(evidence)
          return (
            <li key={evidence.id}>
              <Card className="flex gap-3 p-3">
                <EvidenceThumb evidence={evidence} className="size-16 shrink-0" />
                <div className="min-w-0 flex-1 space-y-1 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-bold text-ink">[P{index + 1}]</span>
                    <Badge tone="info">{t(`dossiers.evidenceType.${evidence.type}`)}</Badge>
                    {evidence.localBlobId && <Badge tone="warning">{t('dossiers.sync.pending')}</Badge>}
                    <span className="text-ink-muted">{formatDate(evidence.createdAt)}</span>
                  </div>
                  {evidence.origin && <p className="text-ink">{evidence.origin}</p>}
                  {evidence.url && (
                    <a href={evidence.url} target="_blank" rel="noreferrer" className="inline-flex max-w-full items-center gap-1 truncate text-cobalt hover:underline">
                      <ExternalLink className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">{evidence.url}</span>
                    </a>
                  )}
                  {evidence.sha256 && <p className="font-mono text-[10px] text-ink-muted">SHA-256 {evidence.sha256.slice(0, 24)}…</p>}
                  {typeof evidence.analysis?.kind === 'string' && <p className="text-ink-muted">{t(`dossiers.analysisKind.${evidence.analysis.kind}`, { defaultValue: evidence.analysis.kind })}</p>}
                  {isImage && images.length > 1 && (
                    <label className="flex min-h-8 items-center gap-1.5 font-semibold text-cobalt">
                      <input
                        type="checkbox"
                        checked={compare.includes(evidence.id)}
                        disabled={!compare.includes(evidence.id) && compare.length === 2}
                        onChange={(event) => setCompare(event.target.checked ? [...compare, evidence.id] : compare.filter((id) => id !== evidence.id))}
                      />
                      <Columns2 className="size-3.5" aria-hidden />
                      {t('dossiers.evidences.compare')}
                    </label>
                  )}
                </div>
              </Card>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ─── Sources ────────────────────────────────────────────────────────────────

export function SourcesTab({ detail }: { detail: CaseDetail }) {
  const { t } = useTranslation()
  const { run, feedback } = useCaseAction()
  const [query, setQuery] = useState('')
  const [all, setAll] = useState<SourceSummary[]>([])
  useEffect(() => {
    loadWithPack('sources', listSources).then((result) => setAll(result.data)).catch(() => setAll([]))
  }, [])
  const linkedIds = new Set(detail.sources.map((source) => source.id))
  const candidates = query.trim().length >= 2 ? all.filter((source) => !linkedIds.has(source.id) && matchesQuery(query, source.name, source.domain ?? '')).slice(0, 6) : []

  return (
    <div className="space-y-3">
      {detail.sources.length === 0 && <p className="rounded-xl bg-warning/20 px-3 py-2 text-xs text-ink">{t('dossiers.sources.required')}</p>}
      <ul className="space-y-2">
        {detail.sources.map((source) => (
          <li key={source.id}>
            <Card className="flex items-center gap-3 p-3">
              <Link to={`/verifier/sources/${source.id}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-ink">{source.name}</span>
                <span className="block text-xs text-ink-muted">{t(`verifier.source.types.${source.type}`, { defaultValue: source.type })}{source.domain && ` · ${source.domain}`}</span>
              </Link>
              {source.verified && <Badge tone="success">{t('verifier.source.verified')}</Badge>}
              <Badge>{source.score === null ? t('ressources.sources.noScore') : `${source.score}/10`}</Badge>
              {!locked(detail) && (
                <button type="button" aria-label={t('dossiers.sources.unlink')} onClick={() => void run({ kind: 'unlink_source', caseId: detail.case.id, sourceId: source.id }, t('dossiers.saved'))} className="flex size-10 items-center justify-center rounded-lg text-ink-muted hover:bg-danger/10 hover:text-danger">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              )}
            </Card>
          </li>
        ))}
      </ul>
      {!locked(detail) && (
        <Card className="space-y-2 p-4">
          <SectionTitle>{t('dossiers.sources.link')}</SectionTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" aria-hidden />
            <Input className="pl-9" aria-label={t('dossiers.sources.search')} placeholder={t('dossiers.sources.search')} value={query} onChange={(event) => setQuery(event.target.value)} />
          </div>
          {candidates.map((source) => (
            <button
              key={source.id}
              type="button"
              onClick={() => {
                void run({ kind: 'link_source', caseId: detail.case.id, source: { id: source.id, name: source.name, type: source.type, domain: source.domain, score: source.score, verified: source.verified } }, t('dossiers.saved'))
                setQuery('')
              }}
              className="flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border border-line px-3 text-left text-sm hover:bg-canvas"
            >
              <span className="truncate text-ink">{source.name}</span>
              <span className="text-xs font-semibold text-cobalt">{t('dossiers.sources.add')}</span>
            </button>
          ))}
          <p className="text-xs text-ink-muted">
            {t('dossiers.sources.createHint')}{' '}
            <Link to="/ressources/sources/nouvelle" className="font-semibold text-cobalt">{t('verifier.source.create')}</Link>
          </p>
        </Card>
      )}
      {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
    </div>
  )
}

// ─── Contacts : demandes de confirmation et experts suggérés ────────────────

export function ContactsTab({ detail }: { detail: CaseDetail }) {
  const { t } = useTranslation()
  const { people } = useDirectory()
  const words = `${detail.case.category ?? ''} ${detail.case.title}`.toLowerCase()
  const suggested = useMemo(
    () =>
      (people ?? [])
        .map((person) => ({
          person,
          score:
            person.domains.filter((domain) => words.includes(domain.toLowerCase()) || matchesQuery(detail.case.category ?? '-', domain)).length * 2 +
            (person.region && person.region === detail.case.region ? 1 : 0),
        }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4),
    [people, words, detail.case.category, detail.case.region],
  )
  return (
    <div className="space-y-3">
      <Card className="space-y-2 p-4">
        <SectionTitle>{t('ressources.person.requests')}</SectionTitle>
        {detail.requests.length === 0 && <p className="text-xs text-ink-muted">{t('dossiers.contacts.none')}</p>}
        {detail.requests.map((request) => (
          <div key={request.id} className="flex flex-wrap items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-xs">
            <span className="font-semibold text-ink">{request.personName}</span>
            <span className="text-ink-muted">{t(`ressources.channel.${request.channel}`, { defaultValue: request.channel })}</span>
            <Badge tone={request.status === 'answered' ? 'success' : 'warning'}>{t(`ressources.confirmation.${request.status}`, { defaultValue: request.status })}</Badge>
            {request.response && <p className="w-full text-ink">{request.response}</p>}
          </div>
        ))}
      </Card>
      <Card className="space-y-2 p-4">
        <SectionTitle>{t('dossiers.contacts.suggested')}</SectionTitle>
        <p className="text-xs text-ink-muted">{t('dossiers.contacts.suggestedHint')}</p>
        {suggested.length === 0 && <p className="text-xs text-ink-muted">{t('common.noResult')}</p>}
        {suggested.map(({ person }) => (
          <Link key={person.id} to={`/ressources/personnes/${person.id}`} className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-canvas">
            <Avatar name={person.fullName} className="size-9" />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-ink">{person.fullName}</span>
              <span className="block truncate text-xs text-ink-muted">{person.position} · {person.domains.join(', ')}</span>
            </span>
          </Link>
        ))}
      </Card>
    </div>
  )
}

// ─── Chiffres cités (comparaisons du MOD-04) ────────────────────────────────

export function FiguresTab({ detail }: { detail: CaseDetail }) {
  const { t, i18n } = useTranslation()
  const format = (value: number) => new Intl.NumberFormat(i18n.resolvedLanguage, { maximumFractionDigits: 1 }).format(value)
  const figures = detail.evidences.filter((evidence) => evidence.analysis?.kind === 'statistic_comparison')
  return (
    <div className="space-y-3">
      <Link to="/ressources/statistiques" className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-xs font-semibold text-cobalt hover:bg-canvas">
        <Scale className="size-4" aria-hidden />
        {t('dossiers.figures.compare')}
      </Link>
      {figures.length === 0 && <p className="py-6 text-center text-sm text-ink-muted">{t('dossiers.figures.none')}</p>}
      {figures.map((evidence) => {
        const analysis = evidence.analysis as { claimed: number; percent: number | null; official: { value: number; unit: string | null; year: number; source: string; source_url: string | null; indicator: string } }
        return (
          <Card key={evidence.id} className="space-y-1 p-4 text-sm">
            <p className="font-semibold text-ink">{analysis.official.indicator}</p>
            <p className="text-ink">
              {t('dossiers.figures.line', {
                claimed: format(analysis.claimed),
                official: format(analysis.official.value),
                unit: analysis.official.unit ?? '',
                percent: analysis.percent === null ? '—' : format(analysis.percent),
                year: analysis.official.year,
              })}
            </p>
            {analysis.official.source_url ? (
              <a href={analysis.official.source_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cobalt hover:underline">{analysis.official.source}</a>
            ) : (
              <p className="text-xs text-ink-muted">{analysis.official.source}</p>
            )}
          </Card>
        )
      })}
    </div>
  )
}

// ─── Checklist guidée (section 11.2) ────────────────────────────────────────

function ChecklistRow({ item, detail }: { item: ChecklistItem; detail: CaseDetail }) {
  const { t, i18n } = useTranslation()
  const { team } = useCaseStore()
  const { run, feedback } = useCaseAction()
  const [state, setState] = useState<ChecklistState>(item.state)
  const [explanation, setExplanation] = useState(item.explanation)
  const [evidenceIds, setEvidenceIds] = useState(item.evidenceIds)
  const dirty = state !== item.state || explanation !== item.explanation || evidenceIds.join() !== item.evidenceIds.join()
  const unjustified = (item.state === 'todo' || item.state === 'in_progress') && !item.explanation.trim()
  const disabled = locked(detail)
  return (
    <li className={cn('space-y-2 rounded-xl border p-3', unjustified ? 'border-line' : 'border-success/40')}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-ink">{t(`dossiers.question.${item.question}`)}</p>
        <select aria-label={t(`dossiers.question.${item.question}`)} disabled={disabled} className="min-h-10 rounded-xl border border-line bg-canvas px-2 text-xs text-ink" value={state} onChange={(event) => setState(event.target.value as ChecklistState)}>
          {CHECKLIST_STATES.map((value) => (
            <option key={value} value={value}>{t(`dossiers.checklistState.${value}`)}</option>
          ))}
        </select>
      </div>
      {!disabled && (
        <>
          <Textarea rows={1} className="min-h-10 py-2" aria-label={t('dossiers.checklist.explanation')} placeholder={t('dossiers.checklist.explanation')} value={explanation} onChange={(event) => setExplanation(event.target.value)} />
          {detail.evidences.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1">
              {detail.evidences.map((evidence, index) => (
                <label key={evidence.id} className="flex min-h-8 items-center gap-1 text-xs text-ink">
                  <input type="checkbox" checked={evidenceIds.includes(evidence.id)} onChange={(event) => setEvidenceIds(event.target.checked ? [...evidenceIds, evidence.id] : evidenceIds.filter((id) => id !== evidence.id))} />
                  P{index + 1}
                </label>
              ))}
            </div>
          )}
          {dirty && (
            <Button
              variant="secondary"
              className="min-h-9 text-xs"
              onClick={() => void run({ kind: 'set_checklist', caseId: detail.case.id, question: item.question, state, explanation, evidenceIds }, t('dossiers.saved'))}
            >
              <Save className="size-3.5" aria-hidden />
              {t('dossiers.save')}
            </Button>
          )}
        </>
      )}
      {(item.state !== 'todo' || item.explanation) && (
        <p className="text-[11px] text-ink-muted">
          {team.find((member) => member.id === item.authorId)?.fullName ?? '—'} · {new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.updatedAt))}
          {item.evidenceIds.length > 0 && ` · ${item.evidenceIds.map((id) => `P${detail.evidences.findIndex((evidence) => evidence.id === id) + 1}`).join(', ')}`}
        </p>
      )}
      {feedback?.tone === 'error' && <FormMessage tone="error">{feedback.text}</FormMessage>}
    </li>
  )
}

export function ChecklistTab({ detail }: { detail: CaseDetail }) {
  const { t } = useTranslation()
  if (detail.checklist.length === 0) return <p className="py-6 text-center text-sm text-ink-muted">{t('dossiers.offlineIncomplete')}</p>
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">{t('dossiers.checklist.hint')}</p>
      {CHECKLIST_BLOCKS.filter((block) => detail.checklist.some((item) => item.block === block)).map((block) => (
        <Card key={block} className="space-y-2 p-4">
          <SectionTitle>{t(`dossiers.block.${block}`)}</SectionTitle>
          <ul className="space-y-2">
            {detail.checklist
              .filter((item) => item.block === block)
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((item) => (
                <ChecklistRow key={`${item.question}-${item.updatedAt}`} item={item} detail={detail} />
              ))}
          </ul>
        </Card>
      ))}
    </div>
  )
}

// ─── Rapport (brouillon ; revue et publication : MOD-06) ────────────────────

export function ReportTab({ detail }: { detail: CaseDetail }) {
  const { t, i18n } = useTranslation()
  const { run, feedback } = useCaseAction()
  const current = detail.report
  const [form, setForm] = useState({
    language: current?.language ?? ((i18n.resolvedLanguage ?? 'fr') as Language),
    summary: current?.summary ?? '',
    explanation: current?.explanation ?? '',
    method: current?.method ?? '',
    claims: current?.claims ?? [],
    publicEvidenceIds: current?.publicEvidenceIds ?? [],
  })
  const editable = !current || current.status === 'draft' || current.status === 'submitted'
  const label = (id: string) => `P${detail.evidences.findIndex((evidence) => evidence.id === id) + 1}`
  const setClaim = (index: number, claim: ReportClaim) => setForm({ ...form, claims: form.claims.map((item, i) => (i === index ? claim : item)) })
  const toggle = (ids: string[], id: string, on: boolean) => (on ? [...ids, id] : ids.filter((item) => item !== id))

  return (
    <Card className="p-4">
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          const claims = form.claims.filter((claim) => claim.text.trim() || claim.evidenceIds.length)
          void run(
            {
              kind: 'save_report',
              caseId: detail.case.id,
              report: { id: current?.id ?? crypto.randomUUID(), status: current?.status ?? 'draft', updatedAt: new Date().toISOString(), ...form, claims },
            },
            t('dossiers.report.saved'),
          )
        }}
      >
        {current?.status === 'published' && current.publicId && (
          <p className="rounded-xl bg-success/10 px-3 py-2 text-sm text-ink">
            {t('dossiers.report.publishedAs', { id: current.publicId })}{' '}
            <Link to={`/portail/rapports/${current.publicId}`} className="font-semibold text-cobalt hover:underline">{t('dossiers.report.openPublic')}</Link>
          </p>
        )}
        <p className="text-xs text-ink-muted">{t('dossiers.report.hint')}</p>
        <div className="space-y-1.5">
          <label htmlFor="report-language" className="text-sm font-semibold text-ink">{t('profil.language')}</label>
          <select id="report-language" className={SELECT} disabled={!editable} value={form.language} onChange={(event) => setForm({ ...form, language: event.target.value as Language })}>
            {LANGUAGES.map((language) => (
              <option key={language} value={language}>{t(`language.${language}`)}</option>
            ))}
          </select>
        </div>
        {(['summary', 'explanation', 'method'] as const).map((field) => (
          <div key={field} className="space-y-1.5">
            <label htmlFor={`report-${field}`} className="text-sm font-semibold text-ink">{t(`dossiers.report.${field}`)}</label>
            <Textarea id={`report-${field}`} rows={field === 'explanation' ? 6 : 3} disabled={!editable} value={form[field]} onChange={(event) => setForm({ ...form, [field]: event.target.value })} placeholder={t(`dossiers.report.${field}Hint`)} />
          </div>
        ))}

        <fieldset className="min-w-0 space-y-2">
          <legend className="text-sm font-semibold text-ink">{t('dossiers.report.claims')}</legend>
          <p className="text-xs text-ink-muted">{t('dossiers.report.claimsHint')}</p>
          {form.claims.map((claim, index) => {
            const unsupported = claim.text.trim() !== '' && !claim.evidenceIds.some((id) => detail.evidences.some((evidence) => evidence.id === id))
            return (
              <div key={index} className={cn('space-y-2 rounded-xl border p-3', unsupported ? 'border-danger bg-danger/5' : 'border-line')}>
                <div className="flex items-start gap-2">
                  <Textarea
                    rows={2}
                    aria-label={t('dossiers.report.claimN', { n: index + 1 })}
                    disabled={!editable}
                    value={claim.text}
                    onChange={(event) => setClaim(index, { ...claim, text: event.target.value })}
                    placeholder={t('dossiers.report.claimPlaceholder')}
                  />
                  {editable && (
                    <button type="button" aria-label={t('dossiers.report.removeClaim', { n: index + 1 })} onClick={() => setForm({ ...form, claims: form.claims.filter((_, i) => i !== index) })} className="flex size-10 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-line hover:text-danger">
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-3 gap-y-1" role="group" aria-label={t('dossiers.report.claimEvidence', { n: index + 1 })}>
                  {detail.evidences.length === 0 && <span className="text-xs text-ink-muted">{t('dossiers.evidences.none')}</span>}
                  {detail.evidences.map((evidence) => (
                    <label key={evidence.id} className="flex min-h-8 items-center gap-1.5 text-xs text-ink" title={evidence.origin ?? evidence.url ?? ''}>
                      <input type="checkbox" disabled={!editable} checked={claim.evidenceIds.includes(evidence.id)} onChange={(event) => setClaim(index, { ...claim, evidenceIds: toggle(claim.evidenceIds, evidence.id, event.target.checked) })} />
                      {label(evidence.id)}
                    </label>
                  ))}
                </div>
                {unsupported && <p className="text-xs font-semibold text-danger">{t('dossiers.report.unsupported')}</p>}
              </div>
            )
          })}
          {editable && (
            <Button type="button" variant="secondary" className="min-h-10 text-xs" onClick={() => setForm({ ...form, claims: [...form.claims, { text: '', evidenceIds: [] }] })}>
              <Plus className="size-4" aria-hidden />
              {t('dossiers.report.addClaim')}
            </Button>
          )}
        </fieldset>

        <fieldset className="min-w-0 space-y-1">
          <legend className="text-sm font-semibold text-ink">{t('dossiers.report.publicEvidences')}</legend>
          <p className="text-xs text-ink-muted">{t('dossiers.report.publicEvidencesHint')}</p>
          {detail.evidences.map((evidence) => (
            <label key={evidence.id} className="flex min-h-9 items-center gap-2 text-xs text-ink">
              <input type="checkbox" disabled={!editable} checked={form.publicEvidenceIds.includes(evidence.id)} onChange={(event) => setForm({ ...form, publicEvidenceIds: toggle(form.publicEvidenceIds, evidence.id, event.target.checked) })} />
              <span className="truncate">[{label(evidence.id)}] {t(`dossiers.evidenceType.${evidence.type}`)} — {evidence.origin ?? evidence.url ?? ''}</span>
            </label>
          ))}
        </fieldset>

        {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
        {editable && (
          <Button type="submit" block>
            <Save className="size-4" aria-hidden />
            {t('dossiers.report.save')}
          </Button>
        )}
      </form>
    </Card>
  )
}

export function HistoryTab({ detail, names, formatDate }: { detail: CaseDetail; names: (id: string | null) => string; formatDate: (iso: string) => string }) {
  const { t } = useTranslation()
  const { run, feedback } = useCaseAction()
  const { team } = useCaseStore()
  const { profile } = useAuth()
  const [body, setBody] = useState('')
  const [mentions, setMentions] = useState<string[]>([])
  const events = [
    ...detail.history.map((entry) => ({ at: entry.changedAt, key: `h-${entry.changedAt}`, node: (
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <CaseStatusBadge status={entry.fromStatus} />
          <span aria-hidden>→</span>
          <CaseStatusBadge status={entry.toStatus} />
        </div>
        <p className="text-sm text-ink">{entry.reason}</p>
        <p className="text-[11px] text-ink-muted">{names(entry.changedBy)} · {formatDate(entry.changedAt)}</p>
      </div>
    ) })),
    ...detail.comments.map((comment) => ({ at: comment.createdAt, key: `c-${comment.id}`, node: (
      <div className="space-y-1">
        <p className="text-sm text-ink">{comment.body}</p>
        {comment.mentions && comment.mentions.length > 0 && (
          <p className="text-xs font-semibold text-cobalt">{comment.mentions.map((id) => `@${names(id)}`).join(' ')}</p>
        )}
        <p className="text-[11px] text-ink-muted">{t('dossiers.history.commentBy', { name: names(comment.authorId) })} · {formatDate(comment.createdAt)}</p>
      </div>
    ) })),
  ].sort((a, b) => a.at.localeCompare(b.at))

  return (
    <div className="space-y-3">
      <Card className="p-4">
        {events.length === 0 && <p className="text-sm text-ink-muted">{t('dossiers.history.none')}</p>}
        <ol className="space-y-3 border-l-2 border-line pl-4">
          {events.map((event) => (
            <li key={event.key}>{event.node}</li>
          ))}
        </ol>
      </Card>
      <Card className="p-4">
        <form
          className="space-y-2"
          onSubmit={async (event) => {
            event.preventDefault()
            const comment = { id: crypto.randomUUID(), body, authorId: null, createdAt: new Date().toISOString(), mentions }
            if (await run({ kind: 'add_comment', caseId: detail.case.id, comment }, t('dossiers.history.commented'))) {
              setBody('')
              setMentions([])
            }
          }}
        >
          <Textarea rows={2} required aria-label={t('dossiers.history.comment')} placeholder={t('dossiers.history.comment')} value={body} onChange={(event) => setBody(event.target.value)} />
          {team.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={t('dossiers.history.mention')}>
              <AtSign className="size-4 text-ink-muted" aria-hidden />
              <span className="text-xs text-ink-muted">{t('dossiers.history.mention')}</span>
              {team.filter((member) => member.id !== profile?.id && member.role !== 'admin').map((member) => {
                const on = mentions.includes(member.id)
                return (
                  <button
                    key={member.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setMentions(on ? mentions.filter((id) => id !== member.id) : [...mentions, member.id])}
                    className={cn('min-h-8 rounded-full border px-2.5 text-xs', on ? 'border-cobalt bg-cobalt/10 font-semibold text-cobalt' : 'border-line text-ink-muted hover:text-ink')}
                  >
                    @{member.fullName}
                  </button>
                )
              })}
            </div>
          )}
          <Button type="submit" variant="secondary" block>{t('dossiers.history.addComment')}</Button>
        </form>
        {feedback && <FormMessage tone={feedback.tone}>{feedback.text}</FormMessage>}
      </Card>
    </div>
  )
}
