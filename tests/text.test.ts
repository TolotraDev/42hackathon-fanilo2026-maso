import { describe, expect, it } from 'vitest'
import { countWords, estimateRadioSeconds, matchesQuery } from '@/lib/text'

describe('countWords', () => {
  it('compte les mots séparés par des espaces', () => {
    expect(countWords('  Tondra-drano  ao Antananarivo ')).toBe(3)
    expect(countWords('')).toBe(0)
  })
})

describe('estimateRadioSeconds', () => {
  it('estime environ 45 s pour une brève de 112 mots', () => {
    expect(estimateRadioSeconds(Array(112).fill('teny').join(' '))).toBe(45)
  })
})

describe('matchesQuery', () => {
  it('ignore la casse et les accents', () => {
    expect(matchesQuery('elevé', 'Niveau ÉLEVÉ')).toBe(true)
    expect(matchesQuery('toamasina', 'Antananarivo')).toBe(false)
  })

  it('accepte tout quand la recherche est vide', () => {
    expect(matchesQuery('  ', 'Antananarivo')).toBe(true)
  })
})
