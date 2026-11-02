// Remplacé par les dossiers réels en MOD-05.
import type { CaseStatus } from '@/types/domain'

export interface DemoCase {
  id: string
  title: string
  status: CaseStatus
  checklistDone: number
  checklistTotal: number
  dueDate: string
}

export const DEMO_CASES: DemoCase[] = [
  { id: 'c1', title: 'Photo d\'inondation « à Antananarivo ce matin »', status: 'in_analysis', checklistDone: 9, checklistTotal: 21, dueDate: '2026-11-03' },
  { id: 'c2', title: 'Bilan chiffré du cyclone diffusé sur WhatsApp', status: 'awaiting_response', checklistDone: 12, checklistTotal: 21, dueDate: '2026-11-03' },
  { id: 'c3', title: 'Pont effondré sur la RN7', status: 'to_review', checklistDone: 19, checklistTotal: 21, dueDate: '2026-11-04' },
  { id: 'c4', title: 'Communiqué sur le prix du riz', status: 'correction_requested', checklistDone: 16, checklistTotal: 21, dueDate: '2026-11-05' },
  { id: 'c5', title: 'Fermeture des écoles publiques', status: 'published', checklistDone: 21, checklistTotal: 21, dueDate: '2026-10-30' },
  { id: 'c6', title: 'Vaccin contre la peste : vidéo d\'un autre pays', status: 'validated', checklistDone: 21, checklistTotal: 21, dueDate: '2026-10-31' },
]

const DONE_STATUSES: CaseStatus[] = ['validated', 'published', 'closed']

export const isCaseDone = (status: CaseStatus) => DONE_STATUSES.includes(status)
