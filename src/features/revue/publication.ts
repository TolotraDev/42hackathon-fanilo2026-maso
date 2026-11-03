// Revue éditoriale et publication (W6) : règles appliquées dès l'appareil, puis revérifiées par le serveur
// (public.report_blockers, public.editorial_decision). Le contenu public est celui qui est signé.
import type { CaseDetail, ReportClaim } from '@/features/dossiers/model'
import type { PublicReport } from '@/features/portail/types'

export type PublicationBlocker =
  | 'verdict_missing'
  | 'report_missing'
  | 'summary_missing'
  | 'explanation_missing'
  | 'claims_missing'
  | 'unsupported_claim'
  | 'public_media_missing'
  | 'self_validation'

export const PUBLICATION_BLOCKERS: PublicationBlocker[] = [
  'verdict_missing',
  'report_missing',
  'summary_missing',
  'explanation_missing',
  'claims_missing',
  'unsupported_claim',
  'public_media_missing',
  'self_validation',
]

/** Une affirmation est étayée si elle a un texte et renvoie à au moins une preuve du dossier. */
export function isSupported(claim: ReportClaim, detail: CaseDetail): boolean {
  return claim.text.trim() !== '' && claim.evidenceIds.some((id) => detail.evidences.some((evidence) => evidence.id === id))
}

/** Photo, vidéo, capture ou lien : ce que le public doit pouvoir voir lui-même dans le rapport publié. */
export function isPublicMedia(evidence: { type: string }): boolean {
  return ['image', 'video', 'screenshot', 'link'].includes(evidence.type)
}

/** Ce qui empêche de valider et publier — copie de public.report_blockers. */
export function reportBlockers(detail: CaseDetail, userId: string | null): PublicationBlocker[] {
  const blockers: PublicationBlocker[] = []
  const { case: record, report } = detail
  if (!record.verdict) blockers.push('verdict_missing')
  if (!report) return [...blockers, 'report_missing']
  if (!report.summary.trim()) blockers.push('summary_missing')
  if (!report.explanation.trim()) blockers.push('explanation_missing')
  if (report.claims.length === 0) blockers.push('claims_missing')
  else if (report.claims.some((claim) => !isSupported(claim, detail))) blockers.push('unsupported_claim')
  if (!detail.evidences.some((evidence) => isPublicMedia(evidence) && report.publicEvidenceIds.includes(evidence.id))) blockers.push('public_media_missing')
  if (record.proposedBy === userId && record.status !== 'validated') blockers.push('self_validation')
  return blockers
}

/** Libellé P1, P2… d'une preuve, dans l'ordre d'ajout (même numérotation que le dossier et le serveur). */
export function evidenceLabel(detail: CaseDetail, id: string): string | null {
  const index = detail.evidences.findIndex((evidence) => evidence.id === id)
  return index >= 0 ? `P${index + 1}` : null
}

/** Contenu public du rapport — copie de private.report_payload (mode démonstration). */
export function buildPublicPayload(
  detail: CaseDetail,
  options: { publicId: string; editorName: string | null; newsroom: string; at: string },
): PublicReport {
  const { case: record } = detail
  const report = detail.report!
  const labelled = detail.evidences.map((evidence, index) => ({ evidence, label: `P${index + 1}` }))
  return {
    public_id: options.publicId,
    language: report.language,
    title: record.title,
    claim: record.claim,
    verdict: record.verdict!,
    confidence: record.confidence,
    theme: record.category,
    region: record.region,
    summary: report.summary.trim(),
    explanation: report.explanation.trim(),
    method: report.method.trim(),
    claims: report.claims.map((claim) => ({
      text: claim.text.trim(),
      evidence: labelled.filter(({ evidence }) => claim.evidenceIds.includes(evidence.id)).map(({ label }) => label),
    })),
    evidences: labelled
      .filter(({ evidence }) => report.publicEvidenceIds.includes(evidence.id))
      .map(({ evidence, label }) => ({
        label,
        type: evidence.type,
        url: evidence.url,
        archive_url: evidence.archiveUrl,
        sha256: evidence.sha256,
        origin: evidence.origin,
        added_at: evidence.createdAt,
        storage_path: evidence.storagePath,
      })),
    newsroom: options.newsroom,
    validated_by: options.editorName,
    published_at: options.at,
    corrections: [],
  }
}

/** JSON à clés triées : même texte pour un même contenu, quel que soit l'ordre des champs. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined)
    return `{${entries
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(',')}}`
  }
  return JSON.stringify(value ?? null)
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Signature du mode démonstration (aucun serveur) : empreinte SHA-256 du contenu canonique.
 * Elle détecte une modification du contenu, mais n'a pas la valeur de la signature serveur (clé secrète).
 */
export async function demoSeal(payload: object): Promise<{ signature: string; contentHash: string }> {
  const text = canonicalJson(payload)
  return { contentHash: await sha256Hex(text), signature: await sha256Hex(`maso-demo|${text}`) }
}
