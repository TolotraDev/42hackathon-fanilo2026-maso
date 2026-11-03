// M6 — Analyse de texte et de rumeur, entièrement sur l'appareil (fonctionne hors connexion).
// Extrait les affirmations vérifiables et repère les signaux de manipulation. Jamais de verdict :
// ce sont des pistes de vérification pour le journaliste.
import { MADAGASCAR_REGIONS } from '@/lib/regions'

export type SignalId = 'urgency' | 'share_appeal' | 'no_source' | 'unsourced_figures' | 'shouting'

export interface TextSignal {
  id: SignalId
  /** Passages qui déclenchent le signal (vide quand c'est une absence, ex. aucune source). */
  matches: string[]
}

export interface TextClaim {
  text: string
  numbers: string[]
  dates: string[]
  places: string[]
  names: string[]
  quotes: string[]
}

export interface TextAnalysis {
  claims: TextClaim[]
  entities: { numbers: string[]; dates: string[]; places: string[]; names: string[] }
  signals: TextSignal[]
  /** Nombres cités, à rapprocher des statistiques officielles (M10). */
  figures: Array<{ value: number; raw: string; context: string }>
}

const CITIES = ['Antananarivo', 'Tana', 'Toamasina', 'Tamatave', 'Mahajanga', 'Majunga', 'Fianarantsoa', 'Toliara', 'Tuléar', 'Antsiranana', 'Diego-Suarez', 'Antsirabe', 'Morondava', 'Nosy Be', 'Fort-Dauphin', 'Taolagnaro', 'Ambatondrazaka', 'Manakara', 'Sambava', 'Madagascar', 'Madagasikara']
const PLACES = [...MADAGASCAR_REGIONS, ...CITIES]

const MONTHS = 'janvier|février|fevrier|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|decembre|janoary|febroary|martsa|aprily|mey|jona|jolay|aogositra|septambra|oktobra|novambra|desambra|january|february|march|april|may|june|july|august|september|october|november|december'
const DATE = new RegExp(`\\b(\\d{1,2}(?:er)?\\s+(?:${MONTHS})(?:\\s+\\d{4})?|\\d{1,2}/\\d{1,2}/\\d{2,4}|(?:${MONTHS})\\s+\\d{4}|(?:19|20)\\d{2}|hier|aujourd'hui|ce matin|omaly|androany|anio)\\b`, 'giu')
const NUMBER = /\b\d{1,3}(?:[ . ]\d{3})+(?:,\d+)?\b|\b\d+(?:[.,]\d+)?\s?%?/gu
const QUOTE = /[«“"]([^»”"]{6,})[»”"]/gu
const NAME = /\b(?:[A-ZÀ-Ý][a-zà-ÿ'’-]+)(?:\s+[A-ZÀ-Ý][a-zà-ÿ'’-]+)+\b/gu

const URGENCY = /\b(urgent|urgence|alerte|vite|immédiatement|avant qu.il ne soit trop tard|dernière minute|exclusif|maika|haingana|tandremo|breaking|right now)\b/giu
const SHARE = /\b(partage[rz]?|partagez|faites (?:tourner|circuler)|diffusez|transférez|zarao|ampielezo|alefaso amin.ny namana|share this)\b/giu
const SOURCE = /\b(selon|d.après|source|a déclaré|a annoncé|communiqué|araka ny|hoy|nambaran|according to)\b|https?:\/\//iu

const unique = (values: string[]) => [...new Set(values.map((value) => value.trim()).filter(Boolean))]
const all = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((match) => match[1] ?? match[0])

export function parseFigure(raw: string): number | null {
  const cleaned = raw.replace(/[%\s ]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function sentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?…])\s+(?=[A-ZÀ-Ý«"“0-9])/u)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0)
}

const fold = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

/** Lieux cités, en mots entiers (« Tana » n'est pas repéré dans « Antananarivo »). */
function places(text: string): string[] {
  const folded = fold(text)
  return PLACES.filter((place) => new RegExp(`(^|[^\\p{L}])${fold(place).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'u').test(folded))
}

export function analyzeText(input: string): TextAnalysis {
  const text = input.trim()
  const claims: TextClaim[] = []
  for (const sentence of sentences(text)) {
    const dates = unique(all(sentence, DATE))
    const numbers = unique(all(sentence, NUMBER)).filter((number) => !dates.some((date) => date.includes(number.trim())))
    const claim: TextClaim = {
      text: sentence,
      numbers,
      dates,
      places: places(sentence),
      names: unique(all(sentence, NAME)).filter((name) => !PLACES.some((place) => name.includes(place))),
      quotes: unique(all(sentence, QUOTE)),
    }
    // Vérifiable : la phrase avance un fait précis (chiffre, date, lieu, personne ou citation).
    if (claim.numbers.length || claim.dates.length || claim.places.length || claim.names.length || claim.quotes.length) claims.push(claim)
  }

  const hasSource = SOURCE.test(text)
  const figures = claims.flatMap((claim) =>
    claim.numbers
      .map((raw) => ({ raw, value: parseFigure(raw), context: claim.text }))
      .filter((figure): figure is { raw: string; value: number; context: string } => figure.value !== null && figure.value >= 10),
  )
  const letters = text.replace(/[^A-Za-zÀ-ÿ]/g, '')
  const upper = letters.replace(/[^A-ZÀ-Ý]/g, '')

  const signals: TextSignal[] = [
    { id: 'urgency', matches: unique(all(text, URGENCY)) },
    { id: 'share_appeal', matches: unique(all(text, SHARE)) },
    { id: 'no_source', matches: hasSource || text.length < 40 ? [] : ['—'] },
    { id: 'unsourced_figures', matches: hasSource ? [] : unique(figures.map((figure) => figure.raw)) },
    { id: 'shouting', matches: (letters.length > 30 && upper.length / letters.length > 0.5) || /!{2,}/.test(text) ? unique(all(text, /[^.!?]*!{2,}/g)).slice(0, 3) : [] },
  ]

  return {
    claims,
    entities: {
      numbers: unique(claims.flatMap((claim) => claim.numbers)),
      dates: unique(claims.flatMap((claim) => claim.dates)),
      places: unique(claims.flatMap((claim) => claim.places)),
      names: unique(claims.flatMap((claim) => claim.names)),
    },
    signals: signals.filter((signal) => signal.matches.length > 0),
    figures,
  }
}
