// Contrat partagé du domaine MASO (cahier des charges, sections 3, 6 et 11).
// Les valeurs sont stables : elles seront aussi utilisées en base (MOD-02).

export const ROLES = ['public', 'journalist', 'fact_checker', 'editor_in_chief', 'admin'] as const
export type Role = (typeof ROLES)[number]

export const CASE_STATUSES = [
  'new',
  'in_analysis',
  'awaiting_response',
  'to_review',
  'correction_requested',
  'validated',
  'published',
  'closed',
] as const
export type CaseStatus = (typeof CASE_STATUSES)[number]

export const VERDICTS = [
  'confirmed',
  'mostly_true',
  'misleading',
  'out_of_context',
  'false',
  'fabricated',
  'unverifiable',
] as const
export type Verdict = (typeof VERDICTS)[number]

export const CONFIDENCE_LEVELS = ['high', 'medium', 'low'] as const
export type ConfidenceLevel = (typeof CONFIDENCE_LEVELS)[number]

export const ALERT_LEVELS = ['low', 'medium', 'high'] as const
export type AlertLevel = (typeof ALERT_LEVELS)[number]

export const ALERT_STATUSES = ['new', 'in_progress', 'verified', 'debunked'] as const
export type AlertStatus = (typeof ALERT_STATUSES)[number]

export const CHECKLIST_STATES = ['todo', 'in_progress', 'done', 'not_applicable'] as const
export type ChecklistState = (typeof CHECKLIST_STATES)[number]

export const CHECKLIST_BLOCKS = ['origin', 'context', 'content', 'sources', 'adversarial', 'conclusion'] as const
export type ChecklistBlock = (typeof CHECKLIST_BLOCKS)[number]

/** Indice qualifié produit par une analyse (section 9) — jamais un verdict. */
export const CLUE_LEVELS = ['none', 'weak', 'to_examine'] as const
export type ClueLevel = (typeof CLUE_LEVELS)[number]

export const LANGUAGES = ['fr', 'mg', 'en'] as const
export type Language = (typeof LANGUAGES)[number]

/** Tonalité visuelle d'un badge ; le libellé reste toujours écrit. */
export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

export const VERDICT_TONES: Record<Verdict, Tone> = {
  confirmed: 'success',
  mostly_true: 'success',
  misleading: 'warning',
  out_of_context: 'warning',
  false: 'danger',
  fabricated: 'danger',
  unverifiable: 'neutral',
}

export const CASE_STATUS_TONES: Record<CaseStatus, Tone> = {
  new: 'neutral',
  in_analysis: 'info',
  awaiting_response: 'info',
  to_review: 'warning',
  correction_requested: 'danger',
  validated: 'success',
  published: 'success',
  closed: 'neutral',
}
