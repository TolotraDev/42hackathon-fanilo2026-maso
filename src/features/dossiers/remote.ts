// Échanges avec Supabase pour les dossiers. Les règles sont revérifiées par le serveur (RLS, fonctions).
import type { SupabaseClient } from '@supabase/supabase-js'
import { toAuthFailure } from '@/features/auth/supabaseErrors'
import type { CaseDetail, CaseRecord, ChecklistItem, EvidenceRecord, Mutation, ReportClaim, ReportDraft } from './model'

export interface Remote {
  fetchCaseList(): Promise<CaseRecord[]>
  fetchDetail(id: string): Promise<CaseDetail | null>
  apply(mutation: Mutation, readBlob: (id: string) => Promise<Blob | undefined>): Promise<void>
}

type Row = Record<string, unknown>

function check<T>(result: { data: T; error: { message: string; code?: string; details?: string } | null }): T {
  if (result.error) {
    const failure = toAuthFailure(result.error)
    // Refus métier du serveur : on garde le code exact pour l'afficher (ex. submission_blocked).
    const code = /^[a-z_]+$/.test(result.error.message) ? result.error.message : failure.code
    throw Object.assign(failure, { serverCode: code, details: result.error.details ?? '' })
  }
  return result.data
}

const toCase = (row: Row, checklist: Array<{ state: string }> = []): CaseRecord => ({
  id: row.id as string,
  title: row.title as string,
  claim: (row.claim as string) ?? '',
  category: (row.category as string) ?? null,
  region: (row.region as string) ?? null,
  priority: (row.priority as 1 | 2 | 3) ?? 2,
  status: row.status as CaseRecord['status'],
  assignedTo: (row.assigned_to as string) ?? null,
  createdBy: (row.created_by as string) ?? null,
  dueDate: (row.due_date as string) ?? null,
  verdict: (row.verdict as CaseRecord['verdict']) ?? null,
  confidence: (row.confidence as CaseRecord['confidence']) ?? null,
  justification: (row.justification as string) ?? null,
  justificationEvidenceIds: (row.justification_evidence_ids as string[]) ?? [],
  proposedBy: (row.proposed_by as string) ?? null,
  alertId: (row.alert_id as string) ?? null,
  createdAt: row.created_at as string,
  updatedAt: row.updated_at as string,
  checklistDone: checklist.filter((item) => item.state === 'done' || item.state === 'not_applicable').length,
  checklistTotal: checklist.length,
})

const toEvidence = (row: Row): EvidenceRecord => ({
  id: row.id as string,
  type: row.type as EvidenceRecord['type'],
  url: (row.url as string) ?? null,
  archiveUrl: (row.archive_url as string) ?? null,
  storagePath: (row.storage_path as string) ?? null,
  sha256: (row.sha256 as string) ?? null,
  phash: (row.phash as string) ?? null,
  origin: (row.origin as string) ?? null,
  analysis: (row.analysis as Record<string, unknown>) ?? null,
  addedBy: (row.added_by as string) ?? null,
  createdAt: row.created_at as string,
})

const toClaims = (links: unknown): ReportClaim[] =>
  Array.isArray(links)
    ? links.map((link: { text?: string; evidence_ids?: string[] }) => ({ text: link.text ?? '', evidenceIds: link.evidence_ids ?? [] }))
    : []

const fromClaims = (claims: ReportClaim[]) => claims.map((claim) => ({ text: claim.text, evidence_ids: claim.evidenceIds }))

function toReport(row: Row): ReportDraft {
  const content = (row.content as Record<string, unknown>) ?? {}
  return {
    id: row.id as string,
    language: row.language as ReportDraft['language'],
    summary: (content.summary as string) ?? '',
    explanation: (content.explanation as string) ?? '',
    method: (content.method as string) ?? '',
    claims: toClaims(row.claim_evidence_links),
    publicEvidenceIds: (content.public_evidence_ids as string[]) ?? [],
    status: row.status as ReportDraft['status'],
    updatedAt: row.updated_at as string,
    version: row.version as number,
    publicId: (row.public_id as string) ?? null,
    signature: (row.signature as string) ?? null,
    contentHash: (row.content_hash as string) ?? null,
    signedAt: (row.signed_at as string) ?? null,
    publishedAt: (row.published_at as string) ?? null,
    corrections: (row.corrections as ReportDraft['corrections']) ?? [],
    signedPayload: (row.signed_payload as Record<string, unknown>) ?? null,
  }
}

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
}

/**
 * Insertion rejouable : si l'élément existe déjà (même identifiant), c'est qu'un envoi précédent a abouti
 * avant une coupure. On le considère comme envoyé au lieu d'afficher une erreur.
 */
function checkInsert(result: { error: { message: string; code?: string; details?: string } | null }) {
  if (result.error?.code === '23505') return
  check({ data: null, error: result.error })
}

export function createRemote(db: SupabaseClient): Remote {
  /**
   * Un envoi déjà arrivé sur le serveur, mais dont la réponse a été perdue (page fermée, coupure), est rejoué
   * au retour du réseau : le serveur le refuse alors (« transition non permise »). Si le dossier est déjà dans
   * l'état demandé, la modification est considérée comme envoyée, au lieu de bloquer toute la file.
   */
  async function alreadyApplied(caseId: string, matches: (row: Row) => boolean): Promise<boolean> {
    const { data } = await db.from('cases').select('status, verdict, justification').eq('id', caseId).maybeSingle()
    return Boolean(data && matches(data as Row))
  }

  return {
    async fetchCaseList() {
      const rows = check(
        await db.from('cases').select('*, checklist_items(state)').order('updated_at', { ascending: false }).limit(300),
      ) as Array<Row & { checklist_items: Array<{ state: string }> }>
      return rows.map((row) => toCase(row, row.checklist_items))
    },

    async fetchDetail(id) {
      const caseRow = check(await db.from('cases').select('*').eq('id', id).maybeSingle()) as Row | null
      if (!caseRow) return null
      const [evidences, checklist, sources, history, comments, requests, reports, decisions] = await Promise.all([
        db.from('evidences').select('*').eq('case_id', id).order('created_at'),
        db.from('checklist_items').select('*').eq('case_id', id).order('sort_order'),
        db.from('case_sources').select('source:sources(id, name, type, domain, score, verified)').eq('case_id', id),
        db.from('case_status_history').select('*').eq('case_id', id).order('changed_at'),
        db.from('comments').select('id, body, author_id, created_at, mentions').eq('case_id', id).order('created_at'),
        db.from('confirmation_requests').select('id, person_id, channel, status, response').eq('case_id', id).order('created_at'),
        db.from('reports').select('*').eq('case_id', id).order('created_at', { ascending: false }).limit(1),
        db.from('editorial_decisions').select('type, comment, author_id, created_at').eq('case_id', id).order('created_at'),
      ])
      const checklistRows = check(checklist) as Row[]
      const requestRows = check(requests) as Row[]
      const personIds = [...new Set(requestRows.map((row) => row.person_id).filter(Boolean))] as string[]
      const people = personIds.length
        ? (check(await db.from('resource_people_directory').select('id, full_name').in('id', personIds)) as Row[])
        : []
      const report = (check(reports) as Row[])[0]
      const versions = report
        ? (check(await db.from('report_versions').select('*').eq('report_id', report.id).order('version')) as Row[])
        : []
      return {
        case: toCase(caseRow, checklistRows as Array<{ state: string }>),
        evidences: (check(evidences) as Row[]).map(toEvidence),
        checklist: checklistRows.map(
          (row): ChecklistItem => ({
            id: row.id as string,
            block: row.block as ChecklistItem['block'],
            question: row.question as string,
            sortOrder: row.sort_order as number,
            state: row.state as ChecklistItem['state'],
            explanation: (row.explanation as string) ?? '',
            evidenceIds: (row.evidence_ids as string[]) ?? [],
            authorId: (row.author_id as string) ?? null,
            updatedAt: row.updated_at as string,
          }),
        ),
        sources: (check(sources) as unknown as Array<{ source: Row | null }>).flatMap(({ source }) =>
          source
            ? [{ id: source.id as string, name: source.name as string, type: source.type as string, domain: (source.domain as string) ?? null, score: source.score === null ? null : Number(source.score), verified: Boolean(source.verified) }]
            : [],
        ),
        history: (check(history) as Row[]).map((row) => ({
          fromStatus: row.from_status as CaseRecord['status'],
          toStatus: row.to_status as CaseRecord['status'],
          reason: row.reason as string,
          changedBy: (row.changed_by as string) ?? null,
          changedAt: row.changed_at as string,
        })),
        comments: (check(comments) as Row[]).map((row) => ({
          id: row.id as string,
          body: row.body as string,
          authorId: (row.author_id as string) ?? null,
          createdAt: row.created_at as string,
          mentions: (row.mentions as string[]) ?? [],
        })),
        requests: requestRows.map((row) => ({
          id: row.id as string,
          personId: (row.person_id as string) ?? null,
          personName: (people.find((person) => person.id === row.person_id)?.full_name as string) ?? '—',
          channel: row.channel as string,
          status: row.status as string,
          response: (row.response as string) ?? null,
        })),
        report: report ? toReport(report) : null,
        reportVersions: versions.map((row) => {
          const content = (row.content as Record<string, string>) ?? {}
          return {
            version: row.version as number,
            summary: content.summary ?? '',
            explanation: content.explanation ?? '',
            method: content.method ?? '',
            claims: toClaims(row.claim_evidence_links),
            authorId: (row.created_by as string) ?? null,
            createdAt: row.created_at as string,
          }
        }),
        decisions: (check(decisions) as Row[]).map((row) => ({
          type: row.type as CaseDetail['decisions'][number]['type'],
          comment: row.comment as string,
          authorId: (row.author_id as string) ?? null,
          createdAt: row.created_at as string,
        })),
      }
    },

    async apply(mutation, readBlob) {
      switch (mutation.kind) {
        case 'create_case': {
          const { input } = mutation
          checkInsert(
            await db.from('cases').insert({
              id: mutation.caseId,
              title: input.title.trim(),
              claim: input.claim.trim(),
              category: input.category.trim() || null,
              region: input.region.trim() || null,
              priority: input.priority,
              due_date: input.dueDate,
              alert_id: input.alertId ?? null,
            }),
          )
          return
        }
        case 'update_case': {
          const { patch } = mutation
          const columns: Row = {}
          if (patch.title !== undefined) columns.title = patch.title
          if (patch.claim !== undefined) columns.claim = patch.claim
          if (patch.category !== undefined) columns.category = patch.category
          if (patch.region !== undefined) columns.region = patch.region
          if (patch.priority !== undefined) columns.priority = patch.priority
          if (patch.dueDate !== undefined) columns.due_date = patch.dueDate
          if (patch.assignedTo !== undefined) columns.assigned_to = patch.assignedTo
          const updated = check(await db.from('cases').update(columns).eq('id', mutation.caseId).select('id')) as Row[]
          // Aucune ligne modifiée : le dossier a été validé ou classé entre-temps. Pas de perte silencieuse.
          if (updated.length === 0) throw Object.assign(new Error('case_locked'), { serverCode: 'case_locked' })
          return
        }
        case 'set_checklist':
          {
            const updated = check(
              await db
                .from('checklist_items')
                .update({ state: mutation.state, explanation: mutation.explanation, evidence_ids: mutation.evidenceIds })
                .eq('case_id', mutation.caseId)
                .eq('question', mutation.question)
                .select('id'),
            ) as Row[]
            if (updated.length === 0) throw Object.assign(new Error('case_locked'), { serverCode: 'case_locked' })
          }
          return
        case 'change_status': {
          const result = await db.rpc('change_case_status', { p_case_id: mutation.caseId, p_to: mutation.to, p_reason: mutation.reason })
          if (result.error && (await alreadyApplied(mutation.caseId, (row) => row.status === mutation.to))) return
          check(result)
          return
        }
        case 'propose_verdict': {
          const result = await db.rpc('propose_verdict', {
            p_case_id: mutation.caseId,
            p_verdict: mutation.verdict,
            p_confidence: mutation.confidence,
            p_justification: mutation.justification,
            p_evidence_ids: mutation.evidenceIds,
          })
          const proposed = (row: Row) => row.status === 'to_review' && row.verdict === mutation.verdict && row.justification === mutation.justification.trim()
          if (result.error && (await alreadyApplied(mutation.caseId, proposed))) return
          check(result)
          return
        }
        case 'add_evidence': {
          const { evidence } = mutation
          let storagePath = evidence.storagePath
          if (evidence.localBlobId) {
            const blob = await readBlob(evidence.localBlobId)
            if (!blob) throw Object.assign(new Error('missing_file'), { serverCode: 'missing_file' })
            storagePath = `${mutation.caseId}/${evidence.sha256 ?? evidence.id}.${EXTENSIONS[blob.type] ?? 'bin'}`
            const { error } = await db.storage.from('evidences').upload(storagePath, blob, { contentType: blob.type || undefined, upsert: false })
            if (error && !/exists|duplicate/i.test(error.message)) check({ data: null, error })
          }
          checkInsert(
            await db.from('evidences').insert({
              id: evidence.id,
              case_id: mutation.caseId,
              type: evidence.type,
              storage_path: storagePath,
              url: evidence.url,
              archive_url: evidence.archiveUrl,
              sha256: evidence.sha256,
              phash: evidence.phash,
              origin: evidence.origin,
              analysis: evidence.analysis,
            }),
          )
          return
        }
        case 'link_source':
          check(await db.from('case_sources').upsert({ case_id: mutation.caseId, source_id: mutation.source.id }, { ignoreDuplicates: true }))
          return
        case 'unlink_source':
          check(await db.from('case_sources').delete().eq('case_id', mutation.caseId).eq('source_id', mutation.sourceId))
          return
        case 'save_report': {
          const { report } = mutation
          const content = { summary: report.summary, explanation: report.explanation, method: report.method, public_evidence_ids: report.publicEvidenceIds }
          const columns = { language: report.language, content, claim_evidence_links: fromClaims(report.claims) }
          const updated = check(await db.from('reports').update(columns).eq('id', report.id).select('id')) as Row[]
          if (updated.length === 0) {
            const existing = check(await db.from('reports').select('id').eq('id', report.id)) as Row[]
            // Le rapport existe mais n'est plus modifiable (publié) : pas de perte silencieuse.
            if (existing.length) throw Object.assign(new Error('report_locked'), { serverCode: 'report_locked' })
            checkInsert(await db.from('reports').insert({ id: report.id, case_id: mutation.caseId, ...columns }))
          }
          return
        }
        case 'add_comment':
          checkInsert(
            await db.from('comments').insert({
              id: mutation.comment.id,
              case_id: mutation.caseId,
              target_type: 'case',
              body: mutation.comment.body,
              mentions: mutation.comment.mentions ?? [],
            }),
          )
          return
        case 'editorial_decision':
          check(await db.rpc('editorial_decision', { p_case_id: mutation.caseId, p_type: mutation.decision, p_comment: mutation.comment }))
          return
        case 'add_correction':
          check(await db.rpc('add_report_correction', { p_case_id: mutation.caseId, p_text: mutation.text }))
          return
      }
    },
  }
}

/** Membres de l'équipe (pour l'attribution et l'historique). */
export async function fetchTeam(db: SupabaseClient): Promise<Array<{ id: string; fullName: string; role: string }>> {
  const rows = check(await db.from('profiles').select('id, full_name, email, role').eq('active', true).order('full_name')) as Row[]
  return rows.map((row) => ({ id: row.id as string, fullName: (row.full_name as string) || (row.email as string), role: row.role as string }))
}
