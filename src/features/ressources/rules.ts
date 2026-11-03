// Règles des ressources, en fonctions pures (testées dans tests/ressources.test.ts).
import type { Role } from '@/types/domain'
import type { DirectoryPerson, Indicator, Visibility } from './types'

/** Une donnée de plus de 3 ans est signalée « ancienne » (M10). */
export const STALE_AFTER_YEARS = 3
/** Une fiche non revalidée depuis 6 mois doit être revérifiée (W9, validation périodique). */
export const REVALIDATE_AFTER_DAYS = 180

export function isStale(indicator: Pick<Indicator, 'year'>, now = new Date()): boolean {
  return now.getFullYear() - indicator.year > STALE_AFTER_YEARS
}

export function needsRevalidation(person: Pick<DirectoryPerson, 'lastValidatedDaysAgo'>): boolean {
  return person.lastValidatedDaysAgo === null || person.lastValidatedDaysAgo > REVALIDATE_AFTER_DAYS
}

/** Mêmes règles que la vue resource_people_directory (mode démonstration). */
export function contactsVisible(visibility: Visibility, role: Role | null, isAuthor = false): boolean {
  if (role === 'public' || role === null) return false
  return visibility !== 'private' || role === 'editor_in_chief' || role === 'admin' || isAuthor
}

export interface Comparison {
  claimed: number
  official: number
  difference: number
  /** Écart en % de la donnée officielle ; null si la donnée officielle vaut 0. */
  percent: number | null
  direction: 'higher' | 'lower' | 'equal'
}

/** Mode « Comparer à une affirmation » (M10) : écart entre le chiffre annoncé et la donnée officielle. */
export function compare(claimed: number, official: number): Comparison {
  const difference = claimed - official
  const percent = official === 0 ? null : Math.round((difference / Math.abs(official)) * 1000) / 10
  const direction = Math.abs(difference) < 1e-9 ? 'equal' : difference > 0 ? 'higher' : 'lower'
  return { claimed, official, difference, percent, direction }
}

/** Lit un nombre saisi à la française ou à l'anglaise : « 3 000 », « 12,5 », « 1.5 ». */
export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/[\s  ]/g, '').replace(/,(?=\d{1,2}$)/, '.').replace(/,/g, '')
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null
  return Number(cleaned)
}

/** Dernière valeur d'un indicateur (par code ou par nom) et son historique trié. */
export function groupIndicators(indicators: Indicator[]) {
  const groups = new Map<string, Indicator[]>()
  for (const indicator of indicators) {
    const key = indicator.code ?? `${indicator.theme}:${indicator.name}`
    groups.set(key, [...(groups.get(key) ?? []), indicator])
  }
  return [...groups.entries()].map(([key, history]) => {
    const sorted = [...history].sort((a, b) => a.year - b.year)
    return { key, latest: sorted[sorted.length - 1], history: sorted }
  })
}

/** Recherche dans l'annuaire : nom, fonction, organisation, domaines. */
export function filterPeople(
  people: DirectoryPerson[],
  filters: {
    query: string
    shellQuery?: string // Ajout de la propriété optionnelle
    domain: string
    region: string
    language: string
    organization: string
    favoritesOnly: boolean
  },
  favorites: Set<string>,
  matches: (query: string, ...fields: string[]) => boolean,
): DirectoryPerson[] {
  const { query, shellQuery = '', ...rest } = filters

  return people.filter((person) => {
    // Champs textuels pour la recherche
    const haystack = [
      person.fullName,
      person.position ?? '',
      person.organization ?? '',
      ...person.domains,
    ]

    // Recherche locale (query) ET recherche globale (shellQuery) en AND
    if (query && !matches(query, ...haystack)) return false
    if (shellQuery && !matches(shellQuery, ...haystack)) return false

    // Application des autres filtres
    if (rest.domain && !person.domains.includes(rest.domain)) return false
    if (rest.region && person.region !== rest.region) return false
    if (rest.language && !person.languages.includes(rest.language as DirectoryPerson['languages'][number])) return false
    if (rest.organization && person.organization !== rest.organization) return false
    if (rest.favoritesOnly && !favorites.has(person.id)) return false

    return true
  })
}