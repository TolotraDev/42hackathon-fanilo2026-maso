// Score de fiabilité d'une source (M7) — même calcul que public.compute_source_score.
// Il n'évalue que la source, jamais la vérité d'une affirmation.

export const SOURCE_CRITERIA = [
  'identity',
  'transparency',
  'seniority',
  'corrections_history',
  'competence',
  'proximity',
  'independence',
  'corroboration',
] as const
export type SourceCriterion = (typeof SOURCE_CRITERIA)[number]

/** 0 = défavorable, 1 = partiel, 2 = favorable. */
export type CriterionScore = 0 | 1 | 2

export interface CriterionAssessment {
  score: CriterionScore
  justification: string
}

export type SourceCriteria = Partial<Record<SourceCriterion, CriterionAssessment>>

/** Score sur 10, arrondi au dixième ; null si aucun critère n'est renseigné. */
export function computeSourceScore(criteria: SourceCriteria): number | null {
  const items = Object.values(criteria).filter((item): item is CriterionAssessment => Boolean(item))
  if (items.length === 0) return null
  const total = items.reduce((sum, item) => sum + item.score, 0)
  return Math.round((100 * total) / (2 * items.length)) / 10
}

/** Critères notés sans justification (refusés par le serveur). */
export function missingJustifications(criteria: SourceCriteria): SourceCriterion[] {
  return SOURCE_CRITERIA.filter((key) => criteria[key] && !criteria[key]!.justification.trim())
}
