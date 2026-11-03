import { describe, expect, it } from 'vitest'
import { guessRole } from '@/features/ressources/InviteFromDirectory'

describe('invitation depuis l’annuaire : rôle proposé', () => {
  it('se déduit de la fonction indiquée sur la fiche', () => {
    expect(guessRole('journaliste')).toBe('journalist')
    expect(guessRole('Fact-checker')).toBe('fact_checker')
    expect(guessRole('Vérificatrice des faits')).toBe('fact_checker')
    expect(guessRole('Rédactrice en chef')).toBe('editor_in_chief')
    expect(guessRole(null)).toBe('journalist')
  })
})
