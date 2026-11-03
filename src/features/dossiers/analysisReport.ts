// Rapport d'analyse automatique d'un dossier : produit à la mise en analyse, relu et validé par le journaliste,
// enregistré comme preuve de type « analysis » (citable P1, P2…), puis vérifié par le fact-checker.
import type { TFunction } from 'i18next'
import type { FactCheckClaim } from '@/lib/analyseApi'
import { findingText } from '@/lib/analysis/findingText'
import { vigilance, type Finding, type FindingLevel, type Vigilance } from '@/lib/analysis/synthesis'
import type { Language } from '@/types/domain'
import type { CaseDetail, EvidenceRecord, ReportDraft } from './model'

export const AUTO_REPORT_KIND = 'auto_report'

export type AnalysisTarget = 'image' | 'link' | 'text'

/** Un élément analysé : une preuve du dossier, ou l'affirmation elle-même. */
export interface AnalysisItem {
  /** Preuve analysée (null : affirmation du dossier). */
  evidenceId: string | null
  target: AnalysisTarget
  label: string
  vigilance: Vigilance
  findings: Array<{ level: FindingLevel; text: string; source: string | null; sourceUrl: string | null }>
  claims: Array<{ text: string | null; publisher: string | null; rating: string | null; url: string | null }>
  record: Record<string, unknown>
}

export interface AutoReport {
  version: 1
  kind: typeof AUTO_REPORT_KIND
  generated_at: string
  vigilance: Vigilance
  items: AnalysisItem[]
  note: string
}

/** Ce que l'on peut analyser dans un dossier : images, liens, puis l'affirmation (texte). */
export function analysisTargets(detail: CaseDetail): Array<{ key: string; target: AnalysisTarget; evidence: EvidenceRecord | null; index: number | null }> {
  const out: Array<{ key: string; target: AnalysisTarget; evidence: EvidenceRecord | null; index: number | null }> = []
  detail.evidences.forEach((evidence, index) => {
    if ((evidence.type === 'image' || evidence.type === 'screenshot') && (evidence.localBlobId || evidence.storagePath)) {
      out.push({ key: evidence.id, target: 'image', evidence, index })
    } else if (evidence.type === 'link' && evidence.url) {
      out.push({ key: evidence.id, target: 'link', evidence, index })
    }
  })
  if (detail.case.claim.trim().length >= 10) out.push({ key: 'claim', target: 'text', evidence: null, index: null })
  return out
}

/** Élément du rapport, avec les phrases déjà rédigées (identiques à l'écran, au PDF et pour le fact-checker). */
export function analysisItem(
  t: TFunction,
  base: { evidenceId: string | null; target: AnalysisTarget; label: string },
  outcome: { findings: Finding[]; claims: FactCheckClaim[]; record: Record<string, unknown> },
): AnalysisItem {
  return {
    ...base,
    vigilance: vigilance(outcome.findings, outcome.claims),
    findings: outcome.findings.map((finding) => ({
      level: finding.level,
      text: findingText(t, finding),
      source: finding.source?.name ?? null,
      sourceUrl: finding.source?.url ?? null,
    })),
    claims: outcome.claims.slice(0, 6).map((claim) => ({ text: claim.text ?? null, publisher: claim.publisher ?? null, rating: claim.rating ?? null, url: claim.url ?? null })),
    record: outcome.record,
  }
}

const RANK: Record<Vigilance, number> = { low: 0, medium: 1, high: 2 }

export function buildAutoReport(items: AnalysisItem[], note: string, now: string): AutoReport {
  const overall = items.reduce<Vigilance>((worst, item) => (RANK[item.vigilance] > RANK[worst] ? item.vigilance : worst), 'low')
  return { version: 1, kind: AUTO_REPORT_KIND, generated_at: now, vigilance: overall, items, note: note.trim() }
}

export function isAutoReport(value: unknown): value is AutoReport {
  return typeof value === 'object' && value !== null && (value as { kind?: unknown }).kind === AUTO_REPORT_KIND && Array.isArray((value as { items?: unknown }).items)
}

/** Dernier rapport d'analyse validé par le journaliste (le plus récent, s'il a été refait). */
export function latestAutoReport(detail: CaseDetail): { evidence: EvidenceRecord; report: AutoReport; label: string } | null {
  for (let index = detail.evidences.length - 1; index >= 0; index--) {
    const evidence = detail.evidences[index]
    if (evidence.type === 'analysis' && isAutoReport(evidence.analysis)) return { evidence, report: evidence.analysis, label: `P${index + 1}` }
  }
  return null
}

/** Sections du PDF du rapport d'analyse (même générateur que l'export du dossier). */
export function autoReportSections(report: AutoReport, t: TFunction, claim: string) {
  return [
    { title: t('dossiers.field.claim'), lines: [claim || '—'] },
    { title: t('dossiers.analysis.overall'), lines: [t(`synthesis.vigilance.${report.vigilance}`), ...(report.note ? [`${t('dossiers.analysis.note')} : ${report.note}`] : [])] },
    ...report.items.map((item) => ({
      title: `${item.label} — ${t(`synthesis.vigilance.${item.vigilance}`)}`,
      lines: [
        ...item.findings.map((finding) => `• [${t(`synthesis.level.${finding.level}`)}] ${finding.text}${finding.source ? ` — ${t('synthesis.source')} : ${finding.source}` : ''}`),
        ...item.claims.map((claim) => `• ${t('dossiers.analysis.publishedCheck')} : ${[claim.publisher, claim.rating].filter(Boolean).join(' — ')} « ${claim.text ?? ''} » ${claim.url ?? ''}`.trim()),
      ],
    })),
    { title: t('dossiers.analysis.limitsTitle'), lines: [t('synthesis.human')] },
  ]
}

/** Phrases d'un texte (pour transformer la note du fact-checker en affirmations étayées). */
function sentences(text: string): string[] {
  return (text.match(/[^.!?\n]+[.!?]*/g) ?? []).map((part) => part.trim()).filter((part) => part.length >= 12)
}

/**
 * Rapport public proposé automatiquement au rédacteur en chef : verdict et note du fact-checker, indices
 * marquants du rapport d'analyse validé, méthode et outils. Entièrement modifiable avant publication.
 */
export function suggestReport(detail: CaseDetail, t: TFunction, language: Language): Omit<ReportDraft, 'id' | 'status' | 'updatedAt'> {
  const record = detail.case
  const analysis = latestAutoReport(detail)
  const verdict = record.verdict ? t(`verdict.${record.verdict}`) : '—'
  const cited = record.justificationEvidenceIds.filter((id) => detail.evidences.some((evidence) => evidence.id === id))
  const support = [...new Set([...cited, ...(analysis ? [analysis.evidence.id] : [])])]
  const notable = analysis?.report.items.flatMap((item) =>
    item.findings.filter((finding) => finding.level === 'alert' || finding.level === 'caution').map((finding) => `• ${finding.text}${finding.source ? ` (${finding.source})` : ''}`),
  ) ?? []
  const tools = [...new Set(analysis?.report.items.flatMap((item) => item.findings.map((finding) => finding.source).filter((name): name is string => Boolean(name))) ?? [])]
  const justification = record.justification?.trim() ?? ''
  const claims = (sentences(justification).length ? sentences(justification) : justification ? [justification] : []).map((text) => ({ text, evidenceIds: support }))
  return {
    language,
    summary: t('dossiers.suggest.summary', { claim: record.claim || record.title, verdict }),
    explanation: [justification, notable.length ? `${t('dossiers.suggest.clues')}\n${notable.join('\n')}` : ''].filter(Boolean).join('\n\n'),
    method: t('dossiers.suggest.method', { tools: tools.length ? tools.join(', ') : '—' }),
    claims,
    publicEvidenceIds: support,
  }
}
