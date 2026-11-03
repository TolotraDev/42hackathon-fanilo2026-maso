// M2 / W3 — Veille : niveaux d'alerte par règles de mots-clés, région, regroupement des rumeurs.
// Logique pure (testée) ; la page assemble les signalements du public et les flux RSS.
import type { AppSettings } from '@/lib/settings'
import { MADAGASCAR_REGIONS } from '@/lib/regions'
import type { AlertLevel } from '@/types/domain'

export interface VeilleItem {
  id: string
  origin: 'report' | 'rss'
  title: string
  text: string
  url: string | null
  source: string
  region: string | null
  date: string | null
  level: AlertLevel
  /** Mots-clés des règles trouvés dans le texte (servent au regroupement). */
  keywords: string[]
  /** Signalement du public : état et nombre de signalements identiques. */
  alertId?: string
  status?: 'new' | 'in_progress' | 'verified' | 'debunked'
  occurrences?: number
}

/** Villes et lieux connus → région (pour situer une rumeur qui ne précise pas sa région). */
const PLACE_REGION: Record<string, (typeof MADAGASCAR_REGIONS)[number]> = {
  antananarivo: 'Analamanga', tana: 'Analamanga', toamasina: 'Atsinanana', tamatave: 'Atsinanana',
  mahajanga: 'Boeny', majunga: 'Boeny', fianarantsoa: 'Haute Matsiatra', toliara: 'Atsimo-Andrefana',
  tulear: 'Atsimo-Andrefana', antsiranana: 'Diana', diego: 'Diana', 'nosy be': 'Diana', antsirabe: 'Vakinankaratra',
  morondava: 'Menabe', taolagnaro: 'Anosy', 'fort-dauphin': 'Anosy', ambatondrazaka: 'Alaotra-Mangoro',
  manakara: 'Fitovinany', sambava: 'Sava', mananjary: 'Vatovavy', ihosy: 'Ihorombe', maintirano: 'Melaky',
  miarinarivo: 'Itasy', tsiroanomandidy: 'Bongolava', maevatanana: 'Betsiboka', antsohihy: 'Sofia',
  fenoarivo: 'Analanjirofo', ambovombe: 'Androy', farafangana: 'Atsimo-Atsinanana', ambositra: "Amoron'i Mania",
}

const normalize = (value: string) => value.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

const contains = (haystack: string, word: string) => new RegExp(`(^|[^a-z0-9])${normalize(word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(haystack)

export function detectRegion(text: string): string | null {
  const haystack = normalize(text)
  const region = MADAGASCAR_REGIONS.find((name) => contains(haystack, name))
  if (region) return region
  const place = Object.keys(PLACE_REGION).find((name) => contains(haystack, name))
  return place ? PLACE_REGION[place] : null
}

/** Niveau : mot-clé « élevé » → élevé ; « moyen » → moyen ; un même contenu signalé 3 fois monte d'un cran. */
export function classify(text: string, rules: AppSettings['alert_rules'], occurrences = 1): { level: AlertLevel; keywords: string[] } {
  const haystack = normalize(text)
  const high = rules.high.filter((word) => contains(haystack, word))
  const medium = rules.medium.filter((word) => contains(haystack, word))
  let level: AlertLevel = high.length ? 'high' : medium.length ? 'medium' : 'low'
  if (occurrences >= 3) level = level === 'low' ? 'medium' : 'high'
  return { level, keywords: [...high, ...medium] }
}

export interface Trend {
  keyword: string
  count: number
  level: AlertLevel
}

const RANK: Record<AlertLevel, number> = { low: 0, medium: 1, high: 2 }

/** Regroupement des rumeurs : mots-clés partagés par plusieurs éléments, du plus fréquent au moins fréquent. */
export function trends(items: VeilleItem[]): Trend[] {
  const groups = new Map<string, Trend>()
  for (const item of items) {
    for (const keyword of new Set(item.keywords.map((word) => word.toLowerCase()))) {
      const trend = groups.get(keyword) ?? { keyword, count: 0, level: 'low' as AlertLevel }
      trend.count += 1
      if (RANK[item.level] > RANK[trend.level]) trend.level = item.level
      groups.set(keyword, trend)
    }
  }
  return [...groups.values()].filter((trend) => trend.count >= 1).sort((a, b) => b.count - a.count || RANK[b.level] - RANK[a.level])
}

export function sortItems(items: VeilleItem[]): VeilleItem[] {
  return [...items].sort((a, b) => RANK[b.level] - RANK[a.level] || (b.date ?? '').localeCompare(a.date ?? ''))
}

export function countByRegion(items: VeilleItem[]): Map<string, { count: number; level: AlertLevel }> {
  const counts = new Map<string, { count: number; level: AlertLevel }>()
  for (const item of items) {
    if (!item.region) continue
    const current = counts.get(item.region) ?? { count: 0, level: 'low' as AlertLevel }
    current.count += 1
    if (RANK[item.level] > RANK[current.level]) current.level = item.level
    counts.set(item.region, current)
  }
  return counts
}
