import { describe, expect, it } from 'vitest'
import { DEMO_DIRECTORY, DEMO_INDICATORS } from '@/data/demo/resources'
import { compare, contactsVisible, filterPeople, groupIndicators, isStale, needsRevalidation, parseNumber } from '@/features/ressources/rules'
import { parseCsv, splitList } from '@/lib/csv'
import { matchesQuery } from '@/lib/text'

describe('comparer un chiffre annoncé à la donnée officielle (M10)', () => {
  it('calcule l’écart en pourcentage', () => {
    expect(compare(40_000_000, 32_740_678)).toMatchObject({ direction: 'higher', percent: 22.2 })
    expect(compare(30, 42.5)).toMatchObject({ direction: 'lower', percent: -29.4 })
    expect(compare(42.5, 42.5).direction).toBe('equal')
    expect(compare(5, 0).percent).toBeNull()
  })

  it('lit les nombres saisis à la française ou à l’anglaise', () => {
    expect(parseNumber('40 000 000')).toBe(40_000_000)
    expect(parseNumber('12,5')).toBe(12.5)
    expect(parseNumber('1,000,000')).toBe(1_000_000)
    expect(parseNumber('3.000.000 morts')).toBeNull()
  })
})

describe('données anciennes et revalidation', () => {
  it('signale une donnée de plus de 3 ans', () => {
    expect(isStale({ year: 2021 }, new Date('2026-11-02'))).toBe(true)
    expect(isStale({ year: 2024 }, new Date('2026-11-02'))).toBe(false)
  })

  it('demande de revalider une fiche de plus de 6 mois', () => {
    expect(needsRevalidation({ lastValidatedDaysAgo: 240 })).toBe(true)
    expect(needsRevalidation({ lastValidatedDaysAgo: 30 })).toBe(false)
    expect(needsRevalidation({ lastValidatedDaysAgo: null })).toBe(true)
  })
})

describe('coordonnées selon la visibilité consentie (copie de resource_people_directory)', () => {
  it('masque les coordonnées privées pour l’équipe, jamais pour le rédacteur en chef', () => {
    expect(contactsVisible('team', 'journalist')).toBe(true)
    expect(contactsVisible('private', 'journalist')).toBe(false)
    expect(contactsVisible('private', 'editor_in_chief')).toBe(true)
    expect(contactsVisible('public', 'public')).toBe(false)
  })
})

describe('recherche dans l’annuaire', () => {
  const none = { query: '', domain: '', region: '', language: '', organization: '', favoritesOnly: false }
  it('trouve un expert par domaine en une saisie', () => {
    const found = filterPeople(DEMO_DIRECTORY, { ...none, query: 'cyclone' }, new Set(), matchesQuery)
    expect(found.map((person) => person.position)).toContain('Climatologue')
  })
  it('filtre par région et favoris', () => {
    const first = DEMO_DIRECTORY[0]
    expect(filterPeople(DEMO_DIRECTORY, { ...none, favoritesOnly: true }, new Set([first.id]), matchesQuery)).toEqual([first])
    expect(filterPeople(DEMO_DIRECTORY, { ...none, region: 'Boeny' }, new Set(), matchesQuery).every((person) => person.region === 'Boeny')).toBe(true)
  })
})

describe('données de démonstration', () => {
  it('aucun chiffre sans source ni date', () => {
    for (const indicator of DEMO_INDICATORS) {
      expect(indicator.source.trim()).not.toBe('')
      expect(indicator.sourceUpdatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
  it('regroupe l’historique par indicateur, dernière année en tête', () => {
    const population = groupIndicators(DEMO_INDICATORS).find((group) => group.key === 'SP.POP.TOTL')!
    expect(population.latest.year).toBe(2025)
    expect(population.history.length).toBeGreaterThan(1)
  })
  it('n’utilise que des coordonnées impossibles à joindre', () => {
    for (const person of DEMO_DIRECTORY) {
      expect(person.phone).toMatch(/^\+261 00 /)
      expect(person.email).toMatch(/@example\.org$/)
    }
  })
})

describe('import CSV', () => {
  it('lit un fichier Excel français (point-virgule, guillemets, BOM)', () => {
    const rows = parseCsv('﻿nom;domaines;fonction\n"Rabe, Jean";climat|météo;"Dit ""le sage"""\n\n')
    expect(rows).toEqual([{ nom: 'Rabe, Jean', domaines: 'climat|météo', fonction: 'Dit "le sage"' }])
    expect(splitList(rows[0].domaines)).toEqual(['climat', 'météo'])
  })
  it('lit un fichier à virgules', () => {
    expect(parseCsv('a,b\r\n1,2\r\n')).toEqual([{ a: '1', b: '2' }])
  })
})
