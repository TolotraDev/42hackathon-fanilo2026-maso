import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCaseStore, type CaseStore } from '@/features/dossiers/caseStore'
import { LocalDb } from '@/features/dossiers/localDb'
import type { CaseDetail, Mutation } from '@/features/dossiers/model'
import { applyMutation, type MutationContext } from '@/features/dossiers/reducer'
import { notificationsFor } from '@/features/notifications/notifications'
import { comparableUrl } from '@/features/portail/comparableUrl'
import { localPortal, readLocalAlerts, writeLocalAlerts } from '@/features/portail/portalApi'
import type { AlertInput } from '@/features/portail/types'
import { diffWords, hasChanges } from '@/features/revue/diff'
import { canonicalJson, demoSeal, reportBlockers } from '@/features/revue/publication'

const journalist: MutationContext = { userId: 'u-j', role: 'journalist', now: '2026-11-02T10:00:00Z' }
const factChecker: MutationContext = { userId: 'u-fc', role: 'fact_checker', now: '2026-11-02T11:00:00Z' }
const editor: MutationContext = { userId: 'u-ed', role: 'editor_in_chief', now: '2026-11-02T12:00:00Z' }
const members = [
  { id: 'u-j', role: 'journalist' },
  { id: 'u-fc', role: 'fact_checker' },
  { id: 'u-ed', role: 'editor_in_chief' },
  { id: 'u-ed2', role: 'editor_in_chief' },
  { id: 'u-admin', role: 'admin' },
]

const SHA = 'ab'.repeat(32)

function reviewedCase(): CaseDetail {
  const steps: Array<[Mutation, MutationContext]> = [
    [{ kind: 'create_case', caseId: 'c1', input: { title: 'Photo d’inondation', claim: 'Antananarivo inondée ce matin', category: 'Climat', region: 'Analamanga', priority: 1, dueDate: null } }, journalist],
    [{ kind: 'update_case', caseId: 'c1', patch: { assignedTo: 'u-fc' } }, journalist],
    [{ kind: 'add_evidence', caseId: 'c1', evidence: { id: 'e1', type: 'image', url: 'https://www.example.org/photo-2024/', archiveUrl: null, storagePath: null, sha256: SHA, phash: 'f0f0f0f0f0f0f0f0', origin: 'Archive 2024', analysis: null, addedBy: null, createdAt: journalist.now } }, journalist],
    [{ kind: 'add_evidence', caseId: 'c1', evidence: { id: 'e2', type: 'link', url: 'https://example.org/note-interne', archiveUrl: null, storagePath: null, sha256: null, phash: null, origin: 'Note interne', analysis: null, addedBy: null, createdAt: journalist.now } }, journalist],
    [{ kind: 'link_source', caseId: 'c1', source: { id: 's1', name: 'Page virale', type: 'page', domain: null, score: null, verified: false } }, journalist],
    [{ kind: 'change_status', caseId: 'c1', to: 'in_analysis', reason: 'Début' }, journalist],
  ]
  let detail: CaseDetail | null = null
  for (const [mutation, ctx] of steps) detail = applyMutation(detail, mutation, ctx)
  for (const item of detail!.checklist) {
    detail = applyMutation(detail, { kind: 'set_checklist', caseId: 'c1', question: item.question, state: 'not_applicable', explanation: '', evidenceIds: [] }, journalist)
  }
  detail = applyMutation(detail, {
    kind: 'save_report',
    caseId: 'c1',
    report: { id: 'r1', language: 'fr', summary: 'La photo date de 2024.', explanation: 'Publiée en mars 2024.', method: 'Recherche inversée.', claims: [{ text: 'La photo a été publiée en 2024', evidenceIds: ['e1'] }], publicEvidenceIds: ['e1'], status: 'draft', updatedAt: factChecker.now },
  }, factChecker)
  return applyMutation(detail, { kind: 'propose_verdict', caseId: 'c1', verdict: 'out_of_context', confidence: 'high', justification: 'Photo de 2024 [P1].', evidenceIds: ['e1'] }, factChecker)
}

const decision = (type: 'validate_publish' | 'request_correction' | 'request_verification' | 'reject', comment = 'Motif'): Extract<Mutation, { kind: 'editorial_decision' }> => ({
  kind: 'editorial_decision',
  caseId: 'c1',
  decision: type,
  comment,
})

describe('revue éditoriale (copie des règles serveur)', () => {
  it('seul le rédacteur en chef décide, toujours avec un commentaire', () => {
    expect(() => applyMutation(reviewedCase(), decision('validate_publish'), factChecker)).toThrow('role_not_allowed')
    expect(() => applyMutation(reviewedCase(), decision('validate_publish', '  '), editor)).toThrow('comment_required')
  })

  it('une affirmation non étayée bloque la publication', () => {
    const detail = reviewedCase()
    const unsupported = { ...detail, report: { ...detail.report!, claims: [...detail.report!.claims, { text: 'Aucune inondation', evidenceIds: [] }] } }
    expect(reportBlockers(unsupported, 'u-ed')).toEqual(['unsupported_claim'])
    expect(() => applyMutation(unsupported, decision('validate_publish'), editor)).toThrow('publication_blocked')
    expect(reportBlockers({ ...detail, report: null }, 'u-ed')).toEqual(['report_missing'])
  })

  it('personne ne publie un verdict qu’il a proposé lui-même', () => {
    expect(reportBlockers(reviewedCase(), 'u-fc')).toContain('self_validation')
    expect(reportBlockers(reviewedCase(), 'u-ed')).toEqual([])
  })

  it('valider et publier : contenu public signé, sans donnée interne', () => {
    const published = applyMutation(reviewedCase(), decision('validate_publish', 'Preuves solides'), { ...editor, publication: { publicId: 'MASO-2026-0001', editorName: 'Rédactrice', newsroom: 'Rédaction démo' } })
    expect(published.case.status).toBe('published')
    expect(published.report?.status).toBe('published')
    expect(published.decisions).toEqual([{ type: 'validate_publish', comment: 'Preuves solides', authorId: 'u-ed', createdAt: editor.now }])
    const payload = published.report!.signedPayload as Record<string, unknown>
    expect(payload.public_id).toBe('MASO-2026-0001')
    expect(payload.claims).toEqual([{ text: 'La photo a été publiée en 2024', evidence: ['P1'] }])
    expect((payload.evidences as unknown[]).length).toBe(1)
    expect(JSON.stringify(payload)).not.toMatch(/Note interne|justification|u-fc/)
  })

  it('demander une correction renvoie le rapport en brouillon ; rejeter classe le dossier', () => {
    const corrected = applyMutation(reviewedCase(), decision('request_correction', 'Préciser la date'), editor)
    expect(corrected.case.status).toBe('correction_requested')
    expect(corrected.report?.status).toBe('draft')
    expect(applyMutation(reviewedCase(), decision('request_verification'), editor).case.status).toBe('in_analysis')
    expect(applyMutation(reviewedCase(), decision('reject', 'Hors sujet'), editor).case.status).toBe('closed')
  })

  it('chaque modification du rapport conserve la version précédente', () => {
    const detail = reviewedCase()
    const edited = applyMutation(detail, { kind: 'save_report', caseId: 'c1', report: { ...detail.report!, summary: 'La photo date de mars 2024.' } }, factChecker)
    expect(edited.reportVersions).toHaveLength(1)
    expect(edited.reportVersions[0]).toMatchObject({ version: 1, summary: 'La photo date de 2024.' })
    expect(edited.report?.version).toBe(2)
    const unchanged = applyMutation(edited, { kind: 'save_report', caseId: 'c1', report: { ...edited.report! } }, factChecker)
    expect(unchanged.reportVersions).toHaveLength(1)
  })

  it('un rapport publié n’est plus modifiable, mais peut recevoir une correction datée', () => {
    const published = applyMutation(reviewedCase(), decision('validate_publish'), editor)
    expect(() => applyMutation(published, { kind: 'save_report', caseId: 'c1', report: { ...published.report!, summary: 'x' } }, factChecker)).toThrow('report_locked')
    expect(() => applyMutation(published, { kind: 'add_correction', caseId: 'c1', text: 'Date' }, journalist)).toThrow('role_not_allowed')
    const corrected = applyMutation(published, { kind: 'add_correction', caseId: 'c1', text: 'Date précisée' }, editor)
    expect((corrected.report!.signedPayload as { corrections: unknown[] }).corrections).toEqual([{ at: editor.now, text: 'Date précisée' }])
  })
})

describe('comparaison de versions', () => {
  it('montre ce qui a été retiré et ajouté, mot à mot', () => {
    const parts = diffWords('La photo date de 2024.', 'La photo date de mars 2024.')
    expect(parts.filter((part) => part.kind === 'added').map((part) => part.text.trim())).toEqual(['mars'])
    expect(parts.some((part) => part.kind === 'removed')).toBe(false)
    expect(hasChanges(diffWords('même texte', 'même texte'))).toBe(false)
    expect(diffWords('a b c', 'a c')).toEqual([{ kind: 'same', text: 'a ' }, { kind: 'removed', text: 'b ' }, { kind: 'same', text: 'c' }])
  })
})

describe('signature et liens comparables', () => {
  it('le JSON canonique ne dépend pas de l’ordre des champs', () => {
    expect(canonicalJson({ b: 1, a: [{ d: 2, c: 'x' }] })).toBe(canonicalJson({ a: [{ c: 'x', d: 2 }], b: 1 }))
  })

  it('toute modification du contenu change la signature', async () => {
    const one = await demoSeal({ verdict: 'false', title: 'A' })
    expect(await demoSeal({ title: 'A', verdict: 'false' })).toEqual(one)
    expect((await demoSeal({ verdict: 'confirmed', title: 'A' })).signature).not.toBe(one.signature)
  })

  it('reconnaît un même lien partagé autrement (copie de private.normalize_url)', () => {
    const base = comparableUrl('https://www.example.org/photo-2024/')
    expect(comparableUrl('http://example.org/photo-2024?utm_source=facebook')).toBe(base)
    expect(comparableUrl('https://example.org/photo-2024/?fbclid=abc#haut')).toBe(base)
    expect(comparableUrl('https://example.org/a?utm_source=f&id=3')).toBe('example.org/a?id=3')
    expect(comparableUrl('https://example.org/a?id=3&utm_x=1')).toBe('example.org/a?id=3')
    expect(comparableUrl('https://example.org/autre')).not.toBe(base)
  })
})

describe('notifications (copie des triggers serveur)', () => {
  it('demande de relecture : les rédacteurs en chef sont prévenus', () => {
    const detail = reviewedCase()
    const before = { ...detail, case: { ...detail.case, status: 'in_analysis' as const } }
    const items = notificationsFor(before, detail, { kind: 'propose_verdict', caseId: 'c1', verdict: 'false', confidence: 'high', justification: '', evidenceIds: [] }, 'u-fc', members, factChecker.now)
    expect(items.map((item) => [item.userId, item.kind])).toEqual([['u-ed', 'review_requested'], ['u-ed2', 'review_requested']])
  })

  it('publication : l’équipe du dossier est prévenue, jamais l’auteur de l’action', () => {
    const before = reviewedCase()
    const after = applyMutation(before, decision('validate_publish'), editor)
    const items = notificationsFor(before, after, decision('validate_publish'), 'u-ed', members, editor.now)
    expect(items.map((item) => item.userId).sort()).toEqual(['u-fc', 'u-j'])
    expect(items.every((item) => item.kind === 'published')).toBe(true)
  })

  it('mention et attribution', () => {
    const detail = reviewedCase()
    const mention: Mutation = { kind: 'add_comment', caseId: 'c1', comment: { id: 'k1', body: 'Peux-tu archiver ?', authorId: null, createdAt: factChecker.now, mentions: ['u-j', 'u-admin'] } }
    expect(notificationsFor(detail, detail, mention, 'u-fc', members, factChecker.now).map((item) => [item.userId, item.kind])).toEqual([['u-j', 'mentioned']])
    const assign: Mutation = { kind: 'update_case', caseId: 'c1', patch: { assignedTo: 'u-ed2' } }
    expect(notificationsFor(detail, { ...detail, case: { ...detail.case, assignedTo: 'u-ed2' } }, assign, 'u-j', members, journalist.now)[0]).toMatchObject({ userId: 'u-ed2', kind: 'assigned' })
  })
})

describe('mode démonstration : publication et portail sur l’appareil', () => {
  let db: LocalDb
  let store: CaseStore
  let ctx: MutationContext

  beforeEach(async () => {
    db = new LocalDb(`test-publication-${crypto.randomUUID()}`)
    ctx = factChecker
    store = createCaseStore({
      db,
      remote: null,
      context: () => ({ ...ctx }),
      isOnline: () => true,
      publication: async () => ({ publicId: 'MASO-2026-0001', editorName: 'Rédactrice', newsroom: 'Rédaction démo' }),
    })
    await db.cases.put({ id: 'c1', detail: reviewedCase(), complete: true })
  })

  const alert = (extra: Partial<AlertInput>): AlertInput => ({ text: '', url: '', platform: '', region: '', language: 'fr', contact: '', file: null, sha256: null, phash: null, trap: '', ...extra })

  it('une décision ne passe jamais par la file d’attente', async () => {
    await expect(store.mutate(decision('validate_publish'))).rejects.toThrow('online_required')
  })

  it('publie, signe, puis le portail montre, vérifie et retrouve le rapport', async () => {
    ctx = editor
    const published = await store.decide(decision('validate_publish', 'OK'))
    expect(published.report?.signature).toMatch(/^[0-9a-f]{64}$/)

    const portal = localPortal(db)
    expect((await portal.reports({ query: 'inondation' })).map((card) => card.public_id)).toEqual(['MASO-2026-0001'])
    expect(await portal.reports({ verdict: 'false' })).toEqual([])
    expect((await portal.report('maso-2026-0001'))?.claims[0].evidence).toEqual(['P1'])
    expect(await portal.verify('MASO-2026-0001')).toMatchObject({ found: true, valid: true })
    expect(await portal.verify('MASO-2026-9999')).toEqual({ found: false })

    expect((await portal.lookup({ sha256: SHA }))[0]?.reason).toBe('same_file')
    expect((await portal.lookup({ phash: 'f0f0f0f0f0f0f0f1' }))[0]?.reason).toBe('similar_image')
    expect((await portal.lookup({ url: 'http://example.org/photo-2024?utm_source=fb' }))[0]?.reason).toBe('same_link')
    expect(await portal.lookup({ phash: '0f0f0f0f0f0f0f0f' })).toEqual([])

    // Contenu modifié après signature : détecté
    const stored = await db.cases.get('c1')
    const report = stored!.detail.report!
    await db.cases.put({ ...stored!, detail: { ...stored!.detail, report: { ...report, signedPayload: { ...report.signedPayload, verdict: 'confirmed' } } } })
    expect(await portal.verify('MASO-2026-0001')).toMatchObject({ found: true, valid: false })
  })

  it('signalement : code de suivi, regroupement des doublons, suivi jusqu’au rapport', async () => {
    const portal = localPortal(db)
    await expect(portal.submit(alert({}))).rejects.toThrow('content_required')
    await expect(portal.submit(alert({ url: 'javascript:alert(1)' }))).rejects.toThrow('invalid_url')
    const robot = await portal.submit(alert({ text: 'spam', trap: 'x' }))
    expect(robot.tracking_code).toMatch(/^[0-9A-F]{10}$/)
    expect(await readLocalAlerts(db)).toEqual([])

    const first = await portal.submit(alert({ text: 'Pénurie de riz annoncée' }))
    const second = await portal.submit(alert({ text: 'pénurie de riz ANNONCÉE' }))
    expect(second).toMatchObject({ tracking_code: first.tracking_code, duplicate: true })
    expect((await readLocalAlerts(db))[0].occurrences).toBe(2)
    expect(await portal.track(first.tracking_code.toLowerCase())).toMatchObject({ found: true, status: 'new', report: null })

    // Pris en charge par le dossier c1, puis publié : le suivi renvoie vers le rapport
    const alerts = await readLocalAlerts(db)
    await writeLocalAlerts(db, alerts.map((item) => ({ ...item, status: 'in_progress', caseId: 'c1' })))
    expect((await portal.track(first.tracking_code)).status).toBe('in_progress')
    ctx = editor
    await store.decide(decision('validate_publish'))
    expect(await portal.track(first.tracking_code)).toMatchObject({ status: 'debunked', report: { public_id: 'MASO-2026-0001' } })
  })

  it('un lien déjà vérifié est signalé « déjà vérifié »', async () => {
    ctx = editor
    await store.decide(decision('validate_publish'))
    const receipt = await localPortal(db).submit(alert({ url: 'https://example.org/photo-2024' }))
    expect(receipt.matches.map((card) => card.public_id)).toEqual(['MASO-2026-0001'])
  })
})
