import type { ClueLevel } from '@/types/domain'

/** États d'une étape d'analyse, affichés en direct (section 9). */
export const STEP_STATES = ['pending', 'running', 'done', 'not_applicable', 'waiting_network', 'unavailable'] as const
export type StepState = (typeof STEP_STATES)[number]

/** Résultat d'une étape : des faits (data) et un indice qualifié, jamais un verdict. */
export interface StepResult<T = unknown> {
  state: StepState
  clue?: ClueLevel
  data?: T
  tool?: string
  durationMs?: number
}

export const pending = <T>(): StepResult<T> => ({ state: 'pending' })
