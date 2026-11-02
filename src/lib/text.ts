/** Nombre de mots d'un texte (séparateurs : espaces). */
export function countWords(text: string): number {
  const trimmed = text.trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Débit moyen d'une lecture radio, en mots par seconde. */
export const RADIO_WORDS_PER_SECOND = 2.5

/** Durée estimée de lecture à l'antenne, en secondes. */
export function estimateRadioSeconds(text: string): number {
  return Math.round(countWords(text) / RADIO_WORDS_PER_SECOND)
}

/** Recherche insensible à la casse et aux accents. */
export function matchesQuery(query: string, ...fields: string[]): boolean {
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()
  const needle = normalize(query.trim())
  return !needle || fields.some((field) => normalize(field).includes(needle))
}
