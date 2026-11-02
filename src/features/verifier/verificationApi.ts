// Accès aux données de vérification (Supabase). Sans Supabase (mode démonstration), ces fonctions
// lèvent NotConfigured : les analyses restent utilisables, seul l'enregistrement est indisponible.
import { supabase } from '@/lib/supabase'
import type { SourceCriteria } from '@/lib/analysis/sourceScore'
import type { CaseStatus, Verdict } from '@/types/domain'
import { toAuthFailure } from '@/features/auth/supabaseErrors'

export class NotConfigured extends Error {
  constructor() {
    super('not_configured')
  }
}

function client() {
  if (!supabase) throw new NotConfigured()
  return supabase
}

function check<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) throw toAuthFailure(result.error)
  return result.data
}

export const isPersistenceAvailable = () => supabase !== null

// ─── Dossiers ───────────────────────────────────────────────────────────────

export interface CaseSummary {
  id: string
  title: string
  status: CaseStatus
}

export async function listOpenCases(): Promise<CaseSummary[]> {
  return check(
    await client()
      .from('cases')
      .select('id, title, status')
      .not('status', 'in', '(published,closed)')
      .order('updated_at', { ascending: false })
      .limit(30),
  ) as CaseSummary[]
}

export async function createCase(title: string, claim: string): Promise<CaseSummary> {
  return check(
    await client().from('cases').insert({ title: title.trim(), claim: claim.trim() }).select('id, title, status').single(),
  ) as CaseSummary
}

// ─── Preuves ────────────────────────────────────────────────────────────────

export interface EvidenceInput {
  caseId: string
  type: 'image' | 'video' | 'link'
  file?: Blob
  fileExtension?: string
  url?: string
  archiveUrl?: string | null
  sha256?: string | null
  phash?: string | null
  origin?: string | null
  analysis: unknown
}

/** Ajoute une preuve : l'original est stocké intact (jamais modifié), avec son empreinte et l'analyse. */
export async function addEvidence(input: EvidenceInput): Promise<{ id: string }> {
  const db = client()
  let storagePath: string | null = null
  if (input.file) {
    storagePath = `${input.caseId}/${input.sha256 ?? crypto.randomUUID()}.${input.fileExtension ?? 'bin'}`
    const { error } = await db.storage.from('evidences').upload(storagePath, input.file, {
      contentType: input.file.type || undefined,
      upsert: false,
    })
    // Le même fichier déjà présent dans ce dossier : on réutilise l'original stocké.
    if (error && !/exists|duplicate/i.test(error.message)) throw toAuthFailure(error)
  }
  return check(
    await db
      .from('evidences')
      .insert({
        case_id: input.caseId,
        type: input.type,
        storage_path: storagePath,
        url: input.url ?? null,
        archive_url: input.archiveUrl ?? null,
        sha256: input.sha256 ?? null,
        phash: input.phash ?? null,
        origin: input.origin ?? null,
        analysis: input.analysis,
      })
      .select('id')
      .single(),
  ) as { id: string }
}

export interface SimilarImage {
  evidence_id: string
  case_id: string
  case_title: string
  case_status: CaseStatus
  verdict: Verdict | null
  distance: number | null
  exact: boolean
}

export async function findSimilarImages(sha256: string, phash: string): Promise<SimilarImage[]> {
  return check(await client().rpc('find_similar_images', { p_sha256: sha256, p_phash: phash })) as SimilarImage[]
}

export async function findCasesWithUrl(url: string): Promise<CaseSummary[]> {
  const rows = check(
    await client().from('evidences').select('case:cases(id, title, status)').eq('url', url).limit(10),
  ) as unknown as Array<{ case: CaseSummary | null }>
  const unique = new Map(rows.filter((row) => row.case).map((row) => [row.case!.id, row.case!]))
  return [...unique.values()]
}

/** Bibliothèque interne : dossiers dont le titre ou l'affirmation contient les mots cherchés. */
export async function searchLibrary(query: string): Promise<Array<CaseSummary & { verdict: Verdict | null }>> {
  const term = query.trim().replace(/[%,()]/g, ' ')
  return check(
    await client()
      .from('cases')
      .select('id, title, status, verdict')
      .or(`title.ilike.%${term}%,claim.ilike.%${term}%`)
      .order('updated_at', { ascending: false })
      .limit(10),
  ) as Array<CaseSummary & { verdict: Verdict | null }>
}

/** Adresse temporaire (1 h) d'une preuve stockée, pour la recherche inversée. */
export async function signedEvidenceUrl(storagePath: string): Promise<string> {
  const { data, error } = await client().storage.from('evidences').createSignedUrl(storagePath, 3600)
  if (error) throw toAuthFailure(error)
  return data.signedUrl
}

// ─── Fiches sources ─────────────────────────────────────────────────────────

export const SOURCE_TYPES = ['media', 'page', 'site', 'account', 'journalist', 'institution', 'person'] as const
export type SourceType = (typeof SOURCE_TYPES)[number]

export interface SourceRecord {
  id: string
  type: SourceType
  name: string
  url: string | null
  domain: string | null
  created_on: string | null
  criteria: SourceCriteria
  score: number | null
  verified: boolean
  confidential: boolean
  created_by: string | null
  updated_at: string
}

export interface SourceInput {
  type: SourceType
  name: string
  url: string | null
  created_on: string | null
  criteria: SourceCriteria
}

const SOURCE_COLUMNS = 'id, type, name, url, domain, created_on, criteria, score, verified, confidential, created_by, updated_at'

export async function getSource(id: string): Promise<SourceRecord> {
  return check(await client().from('sources').select(SOURCE_COLUMNS).eq('id', id).single()) as SourceRecord
}

export async function findSourceByDomain(domain: string): Promise<SourceRecord | null> {
  const rows = check(await client().from('sources').select(SOURCE_COLUMNS).eq('domain', domain).limit(1)) as SourceRecord[]
  return rows[0] ?? null
}

export async function saveSource(input: SourceInput, id?: string): Promise<SourceRecord> {
  const query = id
    ? client().from('sources').update(input).eq('id', id)
    : client().from('sources').insert(input)
  return check(await query.select(SOURCE_COLUMNS).single()) as SourceRecord
}

export async function verifySource(id: string, verified: boolean): Promise<void> {
  check(await client().rpc('verify_source', { p_source_id: id, p_verified: verified }))
}

export async function readConfidentialDetails(id: string): Promise<string | null> {
  return check(await client().rpc('get_confidential_source_details', { p_source_id: id })) as string | null
}

export async function saveConfidentialDetails(id: string, details: string): Promise<void> {
  check(await client().rpc('set_confidential_source_details', { p_source_id: id, p_details: details }))
}

export async function casesLinkedToSource(id: string): Promise<CaseSummary[]> {
  const rows = check(
    await client().from('case_sources').select('case:cases(id, title, status)').eq('source_id', id),
  ) as unknown as Array<{ case: CaseSummary | null }>
  return rows.flatMap((row) => (row.case ? [row.case] : []))
}
