// Synthèse d'une analyse : « Ce que disent les indices ». Chaque élément est un fait ou un indice,
// accompagné de sa source. Le niveau de vigilance dit s'il faut se méfier, jamais si c'est vrai ou faux :
// le verdict reste celui d'un journaliste (cahier des charges, sections 9 et 11).
import type { FactCheckClaim } from '@/lib/analyseApi'

export type FindingLevel = 'alert' | 'caution' | 'ok' | 'info'

export interface Finding {
  level: FindingLevel
  /** Clé de traduction sous « synthesis.finding. » et ses paramètres. */
  key: string
  params?: Record<string, string | number>
  source?: { name: string; url?: string | null }
}

export type Vigilance = 'high' | 'medium' | 'low'

/** Sens d'une note publiée par un média de vérification (texte libre, en plusieurs langues). */
export type RatingKind = 'false' | 'misleading' | 'true' | 'other'

const FALSE_WORDS = /\b(faux|fausse|false|fake|incorrect|inexact|infond|pants on fire|fabricated|invent|scam|arnaque|diso|hoax|canular)/i
const MISLEADING_WORDS = /(tromp|mislead|hors contexte|out of context|manipul|alt[eé]r|retouch|partly|partiellement|mix|exag[eé]r|missing context|sans contexte|satire|mamitaka)/i
const TRUE_WORDS = /\b(vrai|true|correct|exact|accurate|confirm|marina)\b/i

export function ratingKind(rating: string | null | undefined): RatingKind {
  if (!rating) return 'other'
  if (MISLEADING_WORDS.test(rating)) return 'misleading'
  if (FALSE_WORDS.test(rating)) return 'false'
  if (TRUE_WORDS.test(rating)) return 'true'
  return 'other'
}

/** Vigilance élevée : un indice d'alerte, ou une vérification publiée qui conclut au faux ou au trompeur. */
export function vigilance(findings: Finding[], claims: FactCheckClaim[] = []): Vigilance {
  if (findings.some((finding) => finding.level === 'alert')) return 'high'
  if (claims.some((claim) => ['false', 'misleading'].includes(ratingKind(claim.rating)))) return 'high'
  if (findings.some((finding) => finding.level === 'caution')) return 'medium'
  return 'low'
}

// ─── Ce que l'utilisateur colle dans « Vérifier » ───────────────────────────

export type InputKind = { kind: 'image_url'; url: string } | { kind: 'video_url'; url: string } | { kind: 'link'; url: string } | { kind: 'text'; text: string } | { kind: 'empty' }

const IMAGE_PATH = /\.(jpe?g|png|webp|gif|heic|avif)$/i
const VIDEO_PATH = /\.(mp4|webm|mov|m4v)$/i
const IMAGE_HOSTS = /(^|\.)(fbcdn\.net|cdninstagram\.com|pbs\.twimg\.com|lookaside\.fbsbx\.com|googleusercontent\.com)$/i

/** Un lien seul est analysé comme lien, image ou vidéo ; sinon, c'est un texte (message reçu). */
export function classifyInput(raw: string): InputKind {
  const value = raw.trim()
  if (!value) return { kind: 'empty' }
  if (/^\S+$/.test(value)) {
    const candidate = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(value) ? `https://${value}` : null
    if (candidate) {
      try {
        const url = new URL(candidate)
        if (['http:', 'https:'].includes(url.protocol) && url.hostname.includes('.')) {
          const href = url.toString()
          if (VIDEO_PATH.test(url.pathname) || /^video[.-]/i.test(url.hostname)) return { kind: 'video_url', url: href }
          if (IMAGE_PATH.test(url.pathname) || (IMAGE_HOSTS.test(url.hostname) && !/^video/i.test(url.hostname))) return { kind: 'image_url', url: href }
          return { kind: 'link', url: href }
        }
      } catch {
        // pas une adresse : traité comme du texte
      }
    }
  }
  return { kind: 'text', text: value }
}

// ─── Image ──────────────────────────────────────────────────────────────────

export interface ImageFacts {
  matches?: Array<{ case_title: string; verdict: string | null; exact: boolean }>
  metadata?: { finding: string; software?: string | null; takenAt?: string | null; device?: string | null }
  provenance?: { present?: boolean; ai_generated?: boolean; valid?: boolean; issuer?: string | null }
  elaClue?: 'none' | 'weak' | 'to_examine'
  ai?: { available: boolean; score?: number; model?: string; error?: string }
  sourceUrl?: string | null
}

export function imageFindings(facts: ImageFacts): Finding[] {
  const out: Finding[] = []
  for (const match of facts.matches ?? []) {
    out.push({
      level: match.verdict ? 'alert' : 'caution',
      key: match.verdict ? 'seenWithVerdict' : 'seenInCase',
      params: { title: match.case_title, verdict: match.verdict ?? '' },
      source: { name: 'MASO' },
    })
  }
  const meta = facts.metadata
  if (meta?.finding === 'generative_tool') out.push({ level: 'alert', key: 'metaGenerative', params: { software: meta.software ?? '' }, source: { name: 'EXIF / XMP' } })
  else if (meta?.finding === 'editing_tool') out.push({ level: 'caution', key: 'metaEditing', params: { software: meta.software ?? '' }, source: { name: 'EXIF / XMP' } })
  else if (meta?.finding === 'future_date') out.push({ level: 'caution', key: 'metaFutureDate', source: { name: 'EXIF' } })
  else if (meta?.finding === 'stripped') out.push({ level: 'info', key: 'metaStripped', source: { name: 'EXIF' } })
  else if (meta?.finding === 'consistent') out.push({ level: 'info', key: 'metaPresent', params: { date: meta.takenAt ?? '—', device: meta.device || '—' }, source: { name: 'EXIF' } })

  const provenance = facts.provenance
  if (provenance?.present && provenance.ai_generated) out.push({ level: 'alert', key: 'c2paAi', params: { issuer: provenance.issuer ?? '—' }, source: { name: 'C2PA' } })
  else if (provenance?.present && provenance.valid === false) out.push({ level: 'caution', key: 'c2paInvalid', source: { name: 'C2PA' } })
  else if (provenance?.present) out.push({ level: 'ok', key: 'c2paValid', params: { issuer: provenance.issuer ?? '—' }, source: { name: 'C2PA' } })

  if (facts.elaClue === 'to_examine') out.push({ level: 'caution', key: 'elaStrong', source: { name: 'ELA' } })
  else if (facts.elaClue === 'weak') out.push({ level: 'info', key: 'elaWeak', source: { name: 'ELA' } })

  if (facts.ai?.available && facts.ai.score !== undefined) {
    const percent = Math.round(facts.ai.score * 100)
    const level: FindingLevel = facts.ai.score >= 0.85 ? 'alert' : facts.ai.score >= 0.6 ? 'caution' : 'ok'
    // Le certificat C2PA déclare une image IA : un score bas du détecteur ne rassure pas (simple information).
    const declaredAi = Boolean(provenance?.present && provenance.ai_generated)
    if (level === 'ok' && declaredAi) out.push({ level: 'info', key: 'aiLowDeclared', params: { percent }, source: { name: facts.ai.model ?? 'IA' } })
    else out.push({ level, key: level === 'ok' ? 'aiLow' : 'aiHigh', params: { percent }, source: { name: facts.ai.model ?? 'IA' } })
  } else if (facts.ai && !facts.ai.available) {
    const error = facts.ai.error
    const key = error === 'quota_exceeded' ? 'aiQuota' : error === 'service_unreachable' ? 'aiUnreachable' : error?.startsWith('model_') && error !== 'model_not_prepared' ? 'aiModelFailed' : 'aiUnavailable'
    out.push({ level: 'info', key })
  }
  out.push({ level: 'info', key: facts.sourceUrl ? 'reverseReady' : 'reverseTodo', source: { name: 'Google Lens, TinEye, Yandex, Bing' } })
  return out
}

// ─── Lien ───────────────────────────────────────────────────────────────────

export interface LinkFacts {
  domain?: string | null
  ageDays?: number | null
  https?: boolean | null
  source?: { name: string; score: number | null } | null
  sourceChecked?: boolean
  page?: { title?: string | null; site?: string | null; publishedAt?: string | null; social?: string | null; blocked?: boolean } | null
  archived?: { timestamp?: string } | null
  cases?: Array<{ title: string; verdict?: string | null }>
}

export function linkFindings(facts: LinkFacts): Finding[] {
  const out: Finding[] = []
  for (const item of facts.cases ?? []) {
    out.push({ level: item.verdict ? 'alert' : 'caution', key: item.verdict ? 'linkCaseVerdict' : 'linkCase', params: { title: item.title, verdict: item.verdict ?? '' }, source: { name: 'MASO' } })
  }
  if (facts.page?.social) out.push({ level: 'info', key: facts.page.blocked ? 'socialBlocked' : 'socialPost', params: { network: facts.page.social } })
  if (facts.ageDays !== null && facts.ageDays !== undefined) {
    if (facts.ageDays < 180) out.push({ level: 'caution', key: 'domainNew', params: { days: facts.ageDays, domain: facts.domain ?? '' }, source: { name: 'RDAP' } })
    else out.push({ level: 'ok', key: 'domainOld', params: { days: facts.ageDays, domain: facts.domain ?? '' }, source: { name: 'RDAP' } })
  }
  if (facts.https === false) out.push({ level: 'caution', key: 'noHttps' })
  if (facts.source) {
    const score = facts.source.score
    out.push({
      level: score === null ? 'info' : score < 4 ? 'caution' : score >= 6.5 ? 'ok' : 'info',
      key: score === null ? 'sourceKnown' : 'sourceScore',
      params: { name: facts.source.name, score: score ?? '—' },
      source: { name: 'Annuaire MASO' },
    })
  } else if (facts.sourceChecked && !facts.page?.social) {
    out.push({ level: 'info', key: 'sourceUnknown', params: { domain: facts.domain ?? '' }, source: { name: 'Annuaire MASO' } })
  }
  if (facts.page?.publishedAt) out.push({ level: 'info', key: 'pageDate', params: { date: facts.page.publishedAt }, source: { name: facts.page.site || facts.domain || '—' } })
  if (facts.archived?.timestamp) out.push({ level: 'info', key: 'archived', params: { date: facts.archived.timestamp }, source: { name: 'Wayback Machine', url: null } })
  return out
}

// ─── Texte ──────────────────────────────────────────────────────────────────

export interface TextFacts {
  signals: string[]
  claims: number
  figures: Array<{ raw: string; percent: number | null; indicator: string; official: number; year: number | string; source?: string | null }>
}

export function textFindings(facts: TextFacts): Finding[] {
  const out: Finding[] = facts.signals.map((signal) => ({ level: 'caution' as const, key: `signal.${signal}` }))
  for (const figure of facts.figures) {
    const gap = figure.percent === null ? null : Math.abs(figure.percent)
    out.push({
      level: gap !== null && gap > 25 ? 'alert' : gap !== null && gap > 10 ? 'caution' : 'ok',
      key: 'figureGap',
      params: { raw: figure.raw, indicator: figure.indicator, official: figure.official, year: figure.year, percent: figure.percent ?? '—' },
      source: { name: figure.source || 'Statistiques officielles' },
    })
  }
  out.push({ level: 'info', key: 'claimsToCheck', params: { count: facts.claims } })
  return out
}

// ─── Vidéo ──────────────────────────────────────────────────────────────────

export function videoFindings(facts: { keyframes: number; sceneChanges: number; durationS: number | null }): Finding[] {
  const out: Finding[] = []
  if (facts.sceneChanges > 0) out.push({ level: 'info', key: 'videoEdited', params: { count: facts.sceneChanges }, source: { name: 'PyAV' } })
  out.push({ level: 'info', key: 'videoKeyframes', params: { count: facts.keyframes }, source: { name: 'Google Lens, TinEye, InVID' } })
  return out
}
