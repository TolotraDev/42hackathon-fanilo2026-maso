// Transitions de statut d'un dossier (section 6).
// Copie fidèle de public.can_transition (supabase/migrations/202611021403_workflow.sql) :
// la base reste la seule autorité, cette fonction sert à n'afficher que les actions possibles.
import type { CaseStatus, Role } from '@/types/domain'
import { isStaff } from './permissions'

type Transition = `${CaseStatus}>${CaseStatus}`

const STAFF_TRANSITIONS: Transition[] = [
  'new>in_analysis',
  'in_analysis>awaiting_response',
  'awaiting_response>in_analysis',
  'correction_requested>in_analysis',
]
const VERDICT_TRANSITIONS: Transition[] = ['in_analysis>to_review', 'correction_requested>to_review']
const EDITOR_TRANSITIONS: Transition[] = [
  'to_review>correction_requested',
  'to_review>in_analysis',
  'to_review>validated',
  'validated>published',
]

export function canTransition(from: CaseStatus, to: CaseStatus, role: Role | null): boolean {
  if (!isStaff(role)) return false
  const transition: Transition = `${from}>${to}`
  if (STAFF_TRANSITIONS.includes(transition)) return true
  if (VERDICT_TRANSITIONS.includes(transition)) return role === 'fact_checker' || role === 'editor_in_chief'
  if (EDITOR_TRANSITIONS.includes(transition)) return role === 'editor_in_chief'
  if (to === 'closed' && from !== 'published' && from !== 'closed') return role === 'editor_in_chief'
  return false
}

/** Personne ne valide son propre travail : l'auteur du verdict proposé ne peut pas le valider. */
export function canValidate(role: Role | null, userId: string, proposedBy: string | null): boolean {
  return canTransition('to_review', 'validated', role) && proposedBy !== userId
}
