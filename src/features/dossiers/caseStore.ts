// Magasin des dossiers : lecture serveur ou appareil, modifications enregistrées sur l'appareil puis envoyées
// dans l'ordre (file de synchronisation avec reprise après coupure, section 12).
// Mode « remote » : Supabase ; mode « local » (démonstration) : tout reste sur l'appareil.
import { demoSeal } from '@/features/revue/publication'
import type { CaseDetail, CaseRecord, Mutation, SyncState } from './model'
import type { LocalDb, OutboxEntry } from './localDb'
import { applyMutation, withDefaults, type MutationContext } from './reducer'
import type { Remote } from './remote'
import { CaseRuleError } from './rules'

export interface FlushResult {
  sent: number
  failed: number
  stoppedOffline: boolean
}

export interface CaseStore {
  readonly mode: 'remote' | 'local'
  listCases(): Promise<{ cases: CaseRecord[]; offline: boolean }>
  getCase(id: string): Promise<{ detail: CaseDetail | null; offline: boolean }>
  mutate(mutation: Mutation): Promise<CaseDetail>
  /** Décision éditoriale ou correction (MOD-06) : envoyée tout de suite, jamais mise en attente. */
  decide(mutation: Extract<Mutation, { kind: 'editorial_decision' | 'add_correction' }>): Promise<CaseDetail>
  saveBlob(id: string, blob: Blob): Promise<void>
  readBlob(id: string): Promise<Blob | undefined>
  syncStates(): Promise<Record<string, SyncState>>
  errors(caseId: string): Promise<string[]>
  pendingCount(): Promise<number>
  flush(): Promise<FlushResult>
  retry(caseId: string): Promise<void>
  discardPending(caseId: string): Promise<void>
  subscribe(listener: () => void): () => void
}

interface StoreOptions {
  db: LocalDb
  remote: Remote | null
  context: () => MutationContext
  isOnline: () => boolean
  /** Mode démonstration : numéro public et signataire d'un rapport publié. */
  publication?: (db: LocalDb) => Promise<NonNullable<MutationContext['publication']>>
  /** Mode démonstration : appelé après chaque modification (notifications sur l'appareil). */
  onLocalChange?: (before: CaseDetail | null, after: CaseDetail, mutation: Mutation) => Promise<void>
}

const REVIEW_KINDS = new Set<Mutation['kind']>(['editorial_decision', 'add_correction'])

const isNetworkError = (error: unknown) =>
  (error as { code?: string })?.code === 'network' || error instanceof TypeError

const errorCode = (error: unknown) =>
  (error as { serverCode?: string; code?: string; message?: string })?.serverCode ??
  (error as { code?: string })?.code ??
  (error as Error)?.message ??
  'unknown'

export function createCaseStore({ db, remote, context, isOnline, publication, onLocalChange }: StoreOptions): CaseStore {
  const listeners = new Set<() => void>()
  const notify = () => listeners.forEach((listener) => listener())
  let flushing: Promise<FlushResult> | null = null
  /** Une modification est arrivée pendant un envoi : il faut repasser sur la file juste après. */
  let dirty = false

  const pendingFor = (caseId: string) => db.outbox.where('caseId').equals(caseId).sortBy('seq')

  /** Ré-applique les modifications en attente par-dessus la version du serveur. */
  async function replayPending(serverDetail: CaseDetail | null, caseId: string): Promise<CaseDetail | null> {
    let detail = serverDetail
    for (const entry of await pendingFor(caseId)) {
      try {
        detail = applyMutation(detail, entry.mutation, context())
      } catch {
        // une modification devenue impossible (ex. dossier validé entre-temps) sera refusée par le serveur
      }
    }
    return detail
  }

  async function refreshDetail(id: string): Promise<CaseDetail | null> {
    const server = await remote!.fetchDetail(id)
    const detail = await replayPending(server, id)
    if (detail) await db.cases.put({ id, detail, complete: true })
    else if ((await pendingFor(id)).length === 0) await db.cases.delete(id)
    return detail
  }

  async function flushNow(): Promise<FlushResult> {
    const result: FlushResult = { sent: 0, failed: 0, stoppedOffline: false }
    if (!remote) return result
    const blockedCases = new Set((await db.outbox.toArray()).filter((entry) => entry.error).map((entry) => entry.caseId))
    const touched = new Set<string>()
    for (const entry of await db.outbox.orderBy('seq').toArray()) {
      if (entry.error || blockedCases.has(entry.caseId)) continue
      if (!isOnline()) {
        result.stoppedOffline = true
        break
      }
      try {
        await remote.apply(entry.mutation, (id) => db.blobs.get(id).then((stored) => stored?.blob))
        await db.outbox.delete(entry.seq!)
        if (entry.mutation.kind === 'add_evidence' && entry.mutation.evidence.localBlobId) {
          await db.blobs.delete(entry.mutation.evidence.localBlobId)
        }
        touched.add(entry.caseId)
        result.sent++
      } catch (error) {
        if (isNetworkError(error)) {
          result.stoppedOffline = true
          break
        }
        // Refus du serveur : on garde la modification et on bloque la suite pour ce dossier (dépendances).
        await db.outbox.update(entry.seq!, { error: errorCode(error) } satisfies Partial<OutboxEntry>)
        blockedCases.add(entry.caseId)
        touched.add(entry.caseId)
        result.failed++
      }
    }
    for (const id of touched) {
      try {
        await refreshDetail(id)
      } catch {
        // la version locale reste affichée ; elle sera rafraîchie à la prochaine ouverture
      }
    }
    if (touched.size) notify()
    return result
  }

  const store: CaseStore = {
    mode: remote ? 'remote' : 'local',

    async listCases() {
      if (remote && isOnline()) {
        try {
          const server = await remote.fetchCaseList()
          const pendingIds = new Set((await db.outbox.toArray()).map((entry) => entry.caseId))
          const local = new Map((await db.cases.toArray()).map((stored) => [stored.id, stored]))
          await db.transaction('rw', db.cases, async () => {
            for (const record of server) {
              const stored = local.get(record.id)
              if (stored && pendingIds.has(record.id)) continue // la version locale contient des modifications en attente
              await db.cases.put(
                stored ? { ...stored, detail: { ...stored.detail, case: record } } : { id: record.id, detail: emptyDetail(record), complete: false },
              )
            }
            const serverIds = new Set(server.map((record) => record.id))
            for (const id of local.keys()) {
              if (!serverIds.has(id) && !pendingIds.has(id)) await db.cases.delete(id)
            }
          })
          return { cases: await localList(), offline: false }
        } catch (error) {
          if (!isNetworkError(error)) throw error
        }
      }
      return { cases: await localList(), offline: Boolean(remote) }
    },

    async getCase(id) {
      if (remote && isOnline()) {
        try {
          return { detail: await refreshDetail(id), offline: false }
        } catch (error) {
          if (!isNetworkError(error)) throw error
        }
      }
      const stored = await db.cases.get(id)
      return { detail: stored ? withDefaults(stored.detail) : null, offline: Boolean(remote) }
    },

    async mutate(mutation) {
      if (REVIEW_KINDS.has(mutation.kind)) throw new CaseRuleError('online_required')
      const stored = await db.cases.get(mutation.caseId)
      const next = applyMutation(stored?.detail ?? null, mutation, context()) // lève CaseRuleError si interdit
      await db.transaction('rw', db.cases, db.outbox, async () => {
        await db.cases.put({ id: mutation.caseId, detail: next, complete: stored?.complete ?? true })
        if (remote) await db.outbox.add({ caseId: mutation.caseId, mutation, createdAt: context().now, error: null })
      })
      if (!remote) await onLocalChange?.(stored?.detail ?? null, next, mutation)
      notify()
      if (remote && isOnline()) void store.flush()
      return next
    },

    async decide(mutation) {
      const stored = await db.cases.get(mutation.caseId)
      const before = stored ? withDefaults(stored.detail) : null
      if (remote) {
        // La signature est faite par le serveur : réseau obligatoire, et dossier entièrement synchronisé.
        if (!isOnline()) throw new CaseRuleError('online_required')
        if ((await pendingFor(mutation.caseId)).length) throw new CaseRuleError('sync_first')
        applyMutation(before, mutation, context()) // mêmes contrôles que le serveur, avant l'envoi
        await remote.apply(mutation, async () => undefined)
        const fresh = await refreshDetail(mutation.caseId)
        notify()
        if (!fresh) throw new CaseRuleError('case_not_found')
        return fresh
      }
      const ctx = context()
      const isPublishing = mutation.kind === 'editorial_decision' && mutation.decision === 'validate_publish'
      if (isPublishing && publication) ctx.publication = await publication(db)
      let next = applyMutation(before, mutation, ctx)
      if (next.report?.status === 'published' && next.report.signedPayload) {
        next = { ...next, report: { ...next.report, ...(await demoSeal(next.report.signedPayload)) } }
      }
      await db.cases.put({ id: mutation.caseId, detail: next, complete: true })
      await onLocalChange?.(before, next, mutation)
      notify()
      return next
    },

    saveBlob: (id, blob) => db.blobs.put({ id, blob }).then(() => undefined),
    readBlob: (id) => db.blobs.get(id).then((stored) => stored?.blob),

    async syncStates() {
      const states: Record<string, SyncState> = {}
      for (const entry of await db.outbox.toArray()) {
        states[entry.caseId] = entry.error || states[entry.caseId] === 'error' ? 'error' : 'pending'
      }
      return states
    },

    async errors(caseId) {
      return (await pendingFor(caseId)).flatMap((entry) => (entry.error ? [`${entry.mutation.kind}:${entry.error}`] : []))
    },

    pendingCount: () => db.outbox.count(),

    flush() {
      if (flushing) {
        dirty = true
        return flushing
      }
      flushing = (async () => {
        const total: FlushResult = { sent: 0, failed: 0, stoppedOffline: false }
        do {
          dirty = false
          const result = await flushNow()
          total.sent += result.sent
          total.failed += result.failed
          total.stoppedOffline = result.stoppedOffline
        } while (dirty && !total.stoppedOffline)
        return total
      })().finally(() => {
        flushing = null
      })
      return flushing
    },

    async retry(caseId) {
      for (const entry of await pendingFor(caseId)) await db.outbox.update(entry.seq!, { error: null })
      notify()
      await store.flush()
    },

    async discardPending(caseId) {
      const entries = await pendingFor(caseId)
      await db.outbox.bulkDelete(entries.map((entry) => entry.seq!))
      for (const entry of entries) {
        if (entry.mutation.kind === 'add_evidence' && entry.mutation.evidence.localBlobId) await db.blobs.delete(entry.mutation.evidence.localBlobId)
      }
      if (remote && isOnline()) await refreshDetail(caseId).catch(() => null)
      else await db.cases.delete(caseId)
      notify()
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }

  async function localList() {
    return (await db.cases.toArray()).map((stored) => stored.detail.case).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }

  return store
}

export const emptyDetail = (record: CaseRecord): CaseDetail => ({
  case: record,
  evidences: [],
  checklist: [],
  sources: [],
  history: [],
  comments: [],
  requests: [],
  report: null,
  reportVersions: [],
  decisions: [],
})
