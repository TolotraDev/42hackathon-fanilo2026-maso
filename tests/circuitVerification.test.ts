import { describe, expect, it } from 'vitest'
import type { TFunction } from 'i18next'
import { analysisItem, analysisTargets, buildAutoReport, latestAutoReport, suggestReport } from '@/features/dossiers/analysisReport'
import type { CaseDetail, Mutation } from '@/features/dossiers/model'
import { applyMutation, type MutationContext } from '@/features/dossiers/reducer'
import { imageFindings } from '@/lib/analysis/synthesis'
import { canTransition } from '@/lib/workflow'

// Traduction de test : la clé et ses paramètres, pour vérifier le contenu sans dépendre des libellés.
const t = ((key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key)) as unknown as TFunction

const journalist: MutationContext = { userId: 'u-j', role: 'journalist', now: '2026-11-03T10:00:00Z' }
const checker: MutationContext = { userId: 'u-fc', role: 'fact_checker', now: '2026-11-03T11:00:00Z' }
const editor: MutationContext = { userId: 'u-ec', role: 'editor_in_chief', now: '2026-11-03T12:00:00Z' }

function inAnalysis(): CaseDetail {
  let detail = applyMutation(null, { kind: 'create_case', caseId: 'c', input: { title: 'Photo virale', claim: 'Cette photo montre le pont de Mahitsy effondré hier', category: '', region: '', priority: 2, dueDate: null } }, journalist)
  const evidence = (id: string, type: 'image' | 'link', extra: object) =>
    ({ kind: 'add_evidence', caseId: 'c', evidence: { id, type, url: null, archiveUrl: null, storagePath: null, sha256: null, phash: null, origin: null, analysis: null, addedBy: null, createdAt: journalist.now, ...extra } }) as Mutation
  detail = applyMutation(detail, evidence('img', 'image', { localBlobId: 'blob-1' }), journalist)
  detail = applyMutation(detail, evidence('lnk', 'link', { url: 'https://exemple.mg/article' }), journalist)
  detail = applyMutation(detail, { kind: 'link_source', caseId: 'c', source: { id: 's', name: 'Page', type: 'page', domain: null, score: 3, verified: false } }, journalist)
  for (const item of detail.checklist) {
    detail = applyMutation(detail, { kind: 'set_checklist', caseId: 'c', question: item.question, state: 'not_applicable', explanation: '', evidenceIds: [] }, journalist)
  }
  return applyMutation(detail, { kind: 'change_status', caseId: 'c', to: 'in_analysis', reason: 'Mise en analyse' }, journalist)
}

function withReport(detail: CaseDetail): CaseDetail {
  const item = analysisItem(t, { evidenceId: 'img', target: 'image', label: 'P1 — image' }, {
    findings: [
      { level: 'alert', key: 'c2paAi', params: { issuer: 'OpenAI' }, source: { name: 'C2PA' } },
      { level: 'info', key: 'metaNone', source: { name: 'EXIF' } },
    ],
    claims: [],
    record: { kind: 'image' },
  })
  const report = buildAutoReport([item], 'Compte créé la semaine dernière', journalist.now)
  const added = applyMutation(detail, { kind: 'add_evidence', caseId: 'c', evidence: { id: 'rep', type: 'analysis', url: null, archiveUrl: null, storagePath: null, sha256: null, phash: null, origin: 'Rapport', analysis: report as unknown as Record<string, unknown>, addedBy: null, createdAt: journalist.now } }, journalist)
  return applyMutation(added, { kind: 'change_status', caseId: 'c', to: 'to_verify', reason: 'Analyse validée' }, journalist)
}

describe('circuit : journaliste → fact-checker → rédacteur en chef', () => {
  it('les transitions suivent les rôles (copie de public.can_transition)', () => {
    expect(canTransition('in_analysis', 'to_verify', 'journalist')).toBe(true)
    expect(canTransition('correction_requested', 'to_verify', 'journalist')).toBe(true)
    expect(canTransition('to_verify', 'to_review', 'journalist')).toBe(false)
    expect(canTransition('to_verify', 'correction_requested', 'journalist')).toBe(false)
    expect(canTransition('to_verify', 'correction_requested', 'fact_checker')).toBe(true)
    expect(canTransition('to_verify', 'to_review', 'fact_checker')).toBe(true)
    expect(canTransition('to_verify', 'validated', 'editor_in_chief')).toBe(false)
    expect(canTransition('in_analysis', 'to_verify', 'admin')).toBe(false)
  })

  it('les cibles analysées : images avec fichier, liens, puis l’affirmation', () => {
    expect(analysisTargets(inAnalysis()).map((target) => target.target)).toEqual(['image', 'link', 'text'])
  })

  it('le rapport validé devient une preuve et part au fact-checker', () => {
    const sent = withReport(inAnalysis())
    expect(sent.case.status).toBe('to_verify')
    const saved = latestAutoReport(sent)
    expect(saved?.label).toBe('P3')
    expect(saved?.report.vigilance).toBe('high')
    expect(saved?.report.items[0].findings[0]).toMatchObject({ level: 'alert', source: 'C2PA' })
  })

  it('le fact-checker renvoie au journaliste avec un motif, qui renvoie après correction', () => {
    const back = applyMutation(withReport(inAnalysis()), { kind: 'change_status', caseId: 'c', to: 'correction_requested', reason: 'Recherche inversée manquante' }, checker)
    expect(back.case.status).toBe('correction_requested')
    expect(back.history.at(-1)).toMatchObject({ toStatus: 'correction_requested', reason: 'Recherche inversée manquante' })
    expect(() => applyMutation(back, { kind: 'change_status', caseId: 'c', to: 'to_review', reason: 'x' }, journalist)).toThrow('transition_not_allowed')
    expect(applyMutation(back, { kind: 'change_status', caseId: 'c', to: 'to_verify', reason: 'Corrigé' }, journalist).case.status).toBe('to_verify')
  })

  it('le fact-checker envoie au rédacteur en chef avec son verdict et sa note', () => {
    const verdict: Mutation = { kind: 'propose_verdict', caseId: 'c', verdict: 'fabricated', confidence: 'high', justification: 'Le certificat C2PA indique une image générée par OpenAI. Aucune publication antérieure ne montre ce pont effondré.', evidenceIds: ['img', 'rep'] }
    const sent = applyMutation(withReport(inAnalysis()), verdict, checker)
    expect(sent.case.status).toBe('to_review')
    expect(sent.history.at(-1)).toMatchObject({ fromStatus: 'to_verify', toStatus: 'to_review' })
  })

  it('le rapport public est proposé au rédacteur en chef, publiable tel quel', () => {
    const verdict: Mutation = { kind: 'propose_verdict', caseId: 'c', verdict: 'fabricated', confidence: 'high', justification: 'Le certificat C2PA indique une image générée par OpenAI. Aucune publication antérieure ne montre ce pont effondré.', evidenceIds: ['img'] }
    const review = applyMutation(withReport(inAnalysis()), verdict, checker)
    const suggestion = suggestReport(review, t, 'fr')
    expect(suggestion.summary).toContain('verdict.fabricated')
    expect(suggestion.claims).toHaveLength(2)
    expect(suggestion.claims[0].evidenceIds).toEqual(['img', 'rep'])
    expect(suggestion.explanation).toContain('C2PA')
    expect(suggestion.publicEvidenceIds).toEqual(['img', 'lnk', 'rep'])
    const saved = applyMutation(review, { kind: 'save_report', caseId: 'c', report: { id: 'r', status: 'draft', updatedAt: editor.now, ...suggestion } }, editor)
    const published = applyMutation(saved, { kind: 'editorial_decision', caseId: 'c', decision: 'validate_publish', comment: 'Publié' }, { ...editor, publication: { publicId: 'MASO-2026-0001', editorName: 'Rédactrice en chef', newsroom: 'MASO' } })
    expect(published.case.status).toBe('published')
    expect(published.report?.signedPayload?.validated_by).toBe('Rédactrice en chef')
  })
})

describe('indice IA contredit par le certificat C2PA', () => {
  it('un score bas du détecteur ne rassure pas quand C2PA déclare une image IA', () => {
    const findings = imageFindings({
      matches: [],
      provenance: { available: true, present: true, ai_generated: true, valid: false, issuer: 'OpenAI' } as never,
      ai: { available: true, score: 0.27, model: 'local' },
    })
    expect(findings.find((finding) => finding.key === 'aiLowDeclared')?.level).toBe('info')
    expect(findings.some((finding) => finding.key === 'aiLow')).toBe(false)
  })
})
