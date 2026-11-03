import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { createCaseStore } from '@/features/dossiers/caseStore'
import { LocalDb } from '@/features/dossiers/localDb'
import type { CaseDetail, Mutation } from '@/features/dossiers/model'
import { applyMutation, type MutationContext } from '@/features/dossiers/reducer'
import { createRemote, type Remote } from '@/features/dossiers/remote'
import { CaseRuleError, verdictBlockers } from '@/features/dossiers/rules'

const journalist: MutationContext = { userId: 'u-journaliste', role: 'journalist', now: '2026-11-02T10:00:00Z' }
const factChecker: MutationContext = { userId: 'u-fc', role: 'fact_checker', now: '2026-11-02T11:00:00Z' }
const editor: MutationContext = { userId: 'u-redaction', role: 'editor_in_chief', now: '2026-11-02T12:00:00Z' }

const create: Mutation = {
  kind: 'create_case',
  caseId: 'case-1',
  input: { title: 'Photo d’inondation', claim: '', category: 'climat', region: 'Analamanga', priority: 1, dueDate: null },
}
const evidence: Mutation = {
  kind: 'add_evidence',
  caseId: 'case-1',
  evidence: { id: 'ev-1', type: 'link', url: 'https://example.org/archive', archiveUrl: null, storagePath: null, sha256: null, phash: null, origin: null, analysis: null, addedBy: null, createdAt: journalist.now },
}

function readyCase(): CaseDetail {
  let detail = applyMutation(null, create, journalist)
  detail = applyMutation(detail, { kind: 'update_case', caseId: 'case-1', patch: { claim: 'Antananarivo inondée ce matin' } }, journalist)
  detail = applyMutation(detail, evidence, journalist)
  detail = applyMutation(detail, { kind: 'link_source', caseId: 'case-1', source: { id: 's-1', name: 'Page Facebook', type: 'page', domain: null, score: 2.5, verified: false } }, journalist)
  for (const item of detail.checklist) {
    detail = applyMutation(detail, { kind: 'set_checklist', caseId: 'case-1', question: item.question, state: 'not_applicable', explanation: '', evidenceIds: [] }, journalist)
  }
  return applyMutation(detail, { kind: 'change_status', caseId: 'case-1', to: 'in_analysis', reason: 'Début' }, journalist)
}

describe('dossier : règles appliquées sur l’appareil (copie des règles du serveur)', () => {
  it('crée la checklist du cahier des charges', () => {
    const detail = applyMutation(null, create, journalist)
    expect(detail.checklist).toHaveLength(17)
    expect(detail.case.status).toBe('new')
    expect(detail.case.checklistTotal).toBe(17)
  })

  it('liste les blocages de soumission', () => {
    const detail = applyMutation(null, create, journalist)
    expect(verdictBlockers(detail, [])).toEqual(['claim_missing', 'source_missing', 'evidence_missing', 'checklist_unjustified'])
    expect(verdictBlockers(readyCase(), ['ev-1'])).toEqual([])
  })

  it('refuse un point « fait » sans preuve liée', () => {
    const detail = applyMutation(applyMutation(null, create, journalist), evidence, journalist)
    expect(() =>
      applyMutation(detail, { kind: 'set_checklist', caseId: 'case-1', question: 'origin.first_date', state: 'done', explanation: '', evidenceIds: [] }, journalist),
    ).toThrow('checklist_evidence_required')
    const done = applyMutation(detail, { kind: 'set_checklist', caseId: 'case-1', question: 'origin.first_date', state: 'done', explanation: 'Archive de 2024', evidenceIds: ['ev-1'] }, journalist)
    expect(done.case.checklistDone).toBe(1)
  })

  it('un journaliste ne propose pas de verdict ; le fact-checker oui, si rien ne bloque', () => {
    const verdict: Mutation = { kind: 'propose_verdict', caseId: 'case-1', verdict: 'out_of_context', confidence: 'high', justification: 'Photo de 2024 [P1].', evidenceIds: ['ev-1'] }
    expect(() => applyMutation(readyCase(), verdict, journalist)).toThrow('role_not_allowed')
    const proposed = applyMutation(readyCase(), verdict, factChecker)
    expect(proposed.case.status).toBe('to_review')
    expect(proposed.history.at(-1)).toMatchObject({ fromStatus: 'in_analysis', toStatus: 'to_review' })
  })

  it('soumission bloquée : les raisons sont données', () => {
    const incomplete = applyMutation(applyMutation(null, create, journalist), { kind: 'change_status', caseId: 'case-1', to: 'in_analysis', reason: 'Début' }, journalist)
    try {
      applyMutation(incomplete, { kind: 'propose_verdict', caseId: 'case-1', verdict: 'false', confidence: 'low', justification: 'x', evidenceIds: [] }, factChecker)
      expect.unreachable()
    } catch (error) {
      expect(error).toBeInstanceOf(CaseRuleError)
      expect((error as CaseRuleError).details).toContain('source_missing')
    }
  })

  it('personne ne valide son propre travail', () => {
    const verdict: Mutation = { kind: 'propose_verdict', caseId: 'case-1', verdict: 'false', confidence: 'medium', justification: 'Contredit [P1].', evidenceIds: ['ev-1'] }
    const proposed = applyMutation(readyCase(), verdict, editor)
    expect(() => applyMutation(proposed, { kind: 'change_status', caseId: 'case-1', to: 'validated', reason: 'OK' }, editor)).toThrow('self_validation_forbidden')
    const other = { ...editor, userId: 'u-redaction-2' }
    expect(applyMutation(proposed, { kind: 'change_status', caseId: 'case-1', to: 'validated', reason: 'Preuves suffisantes' }, other).case.status).toBe('validated')
  })

  it('un dossier validé n’est plus modifiable', () => {
    const verdict: Mutation = { kind: 'propose_verdict', caseId: 'case-1', verdict: 'false', confidence: 'medium', justification: 'Contredit [P1].', evidenceIds: ['ev-1'] }
    const validated = applyMutation(applyMutation(readyCase(), verdict, factChecker), { kind: 'change_status', caseId: 'case-1', to: 'validated', reason: 'OK' }, editor)
    expect(() => applyMutation(validated, { kind: 'update_case', caseId: 'case-1', patch: { title: 'Autre' } }, journalist)).toThrow('case_locked')
  })
})

// ─── Synchronisation ───────────────────────────────────────────────────────

class FakeRemote implements Remote {
  online = true
  server = new Map<string, CaseDetail>()
  applied: Mutation[] = []
  rejectKinds = new Set<Mutation['kind']>()
  async fetchCaseList() {
    if (!this.online) throw new TypeError('Failed to fetch')
    return [...this.server.values()].map((detail) => detail.case)
  }
  async fetchDetail(id: string) {
    if (!this.online) throw new TypeError('Failed to fetch')
    return this.server.get(id) ?? null
  }
  async apply(mutation: Mutation, readBlob: (id: string) => Promise<Blob | undefined>) {
    if (!this.online) throw new TypeError('Failed to fetch')
    if (this.rejectKinds.has(mutation.kind)) throw Object.assign(new Error('refus'), { serverCode: 'submission_blocked' })
    if (mutation.kind === 'add_evidence' && mutation.evidence.localBlobId) {
      const blob = await readBlob(mutation.evidence.localBlobId)
      if (!blob) throw new Error('missing_file')
    }
    this.applied.push(mutation)
    this.server.set(mutation.caseId, applyMutation(this.server.get(mutation.caseId) ?? null, mutation, journalist))
  }
}

describe('synchronisation hors ligne', () => {
  let remote: FakeRemote
  let db: LocalDb
  const store = () => createCaseStore({ db, remote, context: () => journalist, isOnline: () => remote.online })

  beforeEach(async () => {
    remote = new FakeRemote()
    db = new LocalDb(`test-${Math.random()}`)
    await db.open()
  })

  it('crée et modifie un dossier sans réseau, puis l’envoie au retour du réseau, dans l’ordre', async () => {
    remote.online = false
    const cases = store()
    await cases.mutate(create)
    await cases.mutate({ kind: 'update_case', caseId: 'case-1', patch: { claim: 'Antananarivo inondée ce matin' } })
    expect((await cases.listCases()).cases.map((record) => record.title)).toEqual(['Photo d’inondation'])
    expect(await cases.syncStates()).toEqual({ 'case-1': 'pending' })
    expect(await cases.pendingCount()).toBe(2)

    remote.online = true
    const result = await cases.flush()
    expect(result).toMatchObject({ sent: 2, failed: 0 })
    expect(remote.applied.map((mutation) => mutation.kind)).toEqual(['create_case', 'update_case'])
    expect(remote.server.get('case-1')?.case.claim).toBe('Antananarivo inondée ce matin')
    expect(await cases.syncStates()).toEqual({})
  })

  it('une modification faite pendant un envoi part aussitôt après, sans attendre le cycle suivant', async () => {
    const cases = store()
    await cases.mutate(create) // lance un envoi en arrière-plan
    await cases.mutate({ kind: 'update_case', caseId: 'case-1', patch: { claim: 'Ajouté pendant l’envoi' } })
    await cases.flush()
    expect(remote.applied.map((mutation) => mutation.kind)).toEqual(['create_case', 'update_case'])
    expect(await cases.pendingCount()).toBe(0)
  })

  it('une coupure pendant l’envoi : rien n’est perdu, la reprise continue où elle s’était arrêtée', async () => {
    const cases = store()
    remote.online = false
    await cases.mutate(create)
    await cases.mutate({ kind: 'update_case', caseId: 'case-1', patch: { title: 'Titre corrigé' } })
    remote.online = true
    const originalApply = remote.apply.bind(remote)
    let calls = 0
    remote.apply = async (mutation, readBlob) => {
      calls++
      if (calls === 2) {
        remote.online = false // coupure au milieu de l'envoi
        throw new TypeError('Failed to fetch')
      }
      return originalApply(mutation, readBlob)
    }
    expect((await cases.flush()).stoppedOffline).toBe(true)
    expect(await cases.pendingCount()).toBe(1)
    remote.online = true
    await cases.flush()
    expect(remote.server.get('case-1')?.case.title).toBe('Titre corrigé')
    expect(await cases.pendingCount()).toBe(0)
  })

  it('les modifications en attente restent visibles par-dessus la version du serveur', async () => {
    const cases = store()
    await cases.mutate(create)
    await cases.flush()
    remote.online = false
    await cases.mutate({ kind: 'update_case', caseId: 'case-1', patch: { claim: 'Modifiée hors ligne' } })
    remote.online = true
    remote.apply = async () => {
      throw new TypeError('Failed to fetch') // le serveur répond à la lecture mais l'envoi échoue
    }
    const { detail } = await cases.getCase('case-1')
    expect(detail?.case.claim).toBe('Modifiée hors ligne')
  })

  it('un refus du serveur est conservé et signalé ; les modifications suivantes du dossier attendent', async () => {
    const cases = store()
    remote.online = false
    await cases.mutate(create)
    await cases.mutate({ kind: 'add_comment', caseId: 'case-1', comment: { id: 'c-1', body: 'À vérifier', authorId: null, createdAt: journalist.now } })
    await cases.mutate({ kind: 'update_case', caseId: 'case-1', patch: { title: 'Après le refus' } })
    remote.online = true
    remote.rejectKinds.add('add_comment')
    const result = await cases.flush()
    expect(result).toMatchObject({ sent: 1, failed: 1 })
    expect(await cases.syncStates()).toEqual({ 'case-1': 'error' })
    expect(await cases.errors('case-1')).toEqual(['add_comment:submission_blocked'])
    expect(remote.server.get('case-1')?.case.title).toBe('Photo d’inondation')
    remote.rejectKinds.clear()
    await cases.retry('case-1')
    expect(remote.server.get('case-1')?.case.title).toBe('Après le refus')
  })

  it('une preuve ajoutée hors ligne garde son fichier sur l’appareil jusqu’à l’envoi', async () => {
    const cases = store()
    remote.online = false
    await cases.mutate(create)
    await cases.saveBlob('blob-1', new Blob(['photo'], { type: 'image/jpeg' }))
    await cases.mutate({ ...evidence, evidence: { ...(evidence as Extract<Mutation, { kind: 'add_evidence' }>).evidence, localBlobId: 'blob-1' } } as Mutation)
    expect(await cases.readBlob('blob-1')).toBeDefined()
    remote.online = true
    await cases.flush()
    expect(remote.applied.map((mutation) => mutation.kind)).toEqual(['create_case', 'add_evidence'])
    expect(await cases.readBlob('blob-1')).toBeUndefined()
  })

  it('mode démonstration : tout reste sur l’appareil, sans file d’envoi', async () => {
    const cases = createCaseStore({ db, remote: null, context: () => journalist, isOnline: () => true })
    await cases.mutate(create)
    expect((await cases.listCases()).cases).toHaveLength(1)
    expect(await cases.pendingCount()).toBe(0)
  })
})

describe('renvoi d’une modification dont la réponse a été perdue', () => {
  // Client Supabase minimal : la fonction serveur refuse (déjà fait), la table renvoie l'état actuel du dossier.
  const fakeDb = (status: string) =>
    ({
      rpc: async () => ({ data: null, error: { message: 'transition_not_allowed', code: '42501' } }),
      from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { status, verdict: null, justification: null }, error: null }) }) }) }),
    }) as unknown as Parameters<typeof createRemote>[0]
  const change: Mutation = { kind: 'change_status', caseId: 'case-1', to: 'in_analysis', reason: 'Début' }

  it('le dossier est déjà dans l’état demandé : considéré comme envoyé, la file n’est pas bloquée', async () => {
    await expect(createRemote(fakeDb('in_analysis')).apply(change, async () => undefined)).resolves.toBeUndefined()
  })

  it('sinon, le refus du serveur est conservé et affiché', async () => {
    await expect(createRemote(fakeDb('validated')).apply(change, async () => undefined)).rejects.toMatchObject({ serverCode: 'transition_not_allowed' })
  })
})
