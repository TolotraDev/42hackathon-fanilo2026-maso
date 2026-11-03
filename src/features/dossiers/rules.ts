// Règles d'un dossier, appliquées dès l'appareil (hors ligne compris) puis revérifiées par le serveur
// (public.verdict_blockers, public.change_case_status, public.propose_verdict).
import { canTransition } from '@/lib/workflow'
import type { Role } from '@/types/domain'
import type { CaseDetail } from './model'

export type Blocker = 'claim_missing' | 'source_missing' | 'evidence_missing' | 'checklist_unjustified'

/** Ce qui empêche de soumettre le verdict (M13) — copie de public.verdict_blockers. */
export function verdictBlockers(detail: CaseDetail, evidenceIds: string[]): Blocker[] {
  const blockers: Blocker[] = []
  if (!detail.case.claim.trim()) blockers.push('claim_missing')
  if (detail.sources.length === 0) blockers.push('source_missing')
  if (!evidenceIds.some((id) => detail.evidences.some((evidence) => evidence.id === id))) blockers.push('evidence_missing')
  if (detail.checklist.some((item) => (item.state === 'todo' || item.state === 'in_progress') && !item.explanation.trim())) {
    blockers.push('checklist_unjustified')
  }
  return blockers
}

export class CaseRuleError extends Error {
  constructor(public readonly code: string, public readonly details: string[] = []) {
    super(code)
  }
}

/** Contrôle d'un changement de statut avant de l'enregistrer (même sans réseau). */
export function assertTransition(detail: CaseDetail, to: CaseDetail['case']['status'], role: Role | null, userId: string | null, reason: string) {
  if (!reason.trim()) throw new CaseRuleError('reason_required')
  if (!canTransition(detail.case.status, to, role)) throw new CaseRuleError('transition_not_allowed')
  if (to === 'to_review' && !detail.case.verdict) throw new CaseRuleError('verdict_required')
  if (to === 'validated' && detail.case.proposedBy === userId) throw new CaseRuleError('self_validation_forbidden')
}

/**
 * Changements de statut proposés dans le dossier. Pendant la relecture (« À relire », « Validé »), les décisions
 * passent par la revue éditoriale (W6) : commentaire obligatoire, signature et publication en un clic.
 */
export const STATUS_ACTIONS_IN_CASE = ['in_analysis', 'awaiting_response', 'to_review', 'closed'] as const
export const IN_REVIEW: readonly string[] = ['to_review', 'validated']
