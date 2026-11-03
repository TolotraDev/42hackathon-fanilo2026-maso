// Client du service d'analyse Python (services/analyse). Dégradation propre : chaque appel peut échouer
// sans bloquer les analyses locales ; l'interface affiche alors « en attente de réseau » ou « indisponible ».
import type { StepState } from './analysis/types'

const BASE = import.meta.env.VITE_ANALYSE_API_URL?.replace(/\/+$/, '') || null

export class ServiceError extends Error {
  constructor(public readonly reason: 'offline' | 'not_configured' | 'unreachable' | 'rejected', public readonly detail?: string) {
    super(reason)
  }
}

/** État d'étape à afficher quand le service n'a pas pu répondre. */
export function stateForServiceError(error: unknown): StepState {
  return error instanceof ServiceError && error.reason === 'offline' ? 'waiting_network' : 'unavailable'
}

// Service injoignable : on le mémorise un moment pour ne pas renvoyer chaque fichier vers une adresse fermée
// (une erreur réseau par analyse dans la console). Un nouveau contrôle est fait après le délai ou au retour du réseau.
const RETRY_AFTER_MS = 30000
let unreachableUntil = 0
let pendingHealth: Promise<HealthResult> | null = null

if (typeof window !== 'undefined') window.addEventListener('online', () => (unreachableUntil = 0))

interface HealthResult {
  status: string
  capabilities: Record<string, boolean>
}

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  return (await request(path, init, timeoutMs)).json() as Promise<T>
}

async function request(path: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  if (!BASE) throw new ServiceError('not_configured')
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ServiceError('offline')
  if (Date.now() < unreachableUntil) throw new ServiceError('unreachable')
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch (failure) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ServiceError('offline')
    // Délai dépassé sur une longue analyse : le service répond, il est seulement lent.
    if (!(failure instanceof DOMException && failure.name === 'TimeoutError')) unreachableUntil = Date.now() + RETRY_AFTER_MS
    throw new ServiceError('unreachable')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ServiceError('rejected', body?.detail ?? String(response.status))
  }
  return response
}

const upload = (file: Blob, name = 'media') => {
  const form = new FormData()
  form.append('file', file, name)
  return { method: 'POST', body: form }
}

export interface ProvenanceResult {
  available: boolean
  present?: boolean
  claim_generator?: string | null
  issuer?: string | null
  signed_at?: string | null
  actions?: Array<{ action: string | null; software: string | null }>
  ai_generated?: boolean
  valid?: boolean
  tool?: string
}

export interface AiClueResult {
  available: boolean
  model: string
  score?: number
  /** token_not_allowed : jeton sans permission ; quota_exceeded : crédits du mois épuisés. */
  error?: string
}

export interface VideoResult {
  info: {
    duration_s: number | null
    codec: string
    width: number
    height: number
    fps: number | null
    bitrate: number | null
    format: string
    audio: boolean
  }
  keyframes: Array<{ time_s: number; reason: 'interval' | 'scene_change'; jpeg_base64: string }>
  tool: string
}

type Attempt<T> = ({ ok: true } & T) | { ok: false; error: string }

export interface LinkResult {
  url: string
  hostname: string
  https: Attempt<{ https: boolean; status: number | null }>
  domain: Attempt<{ available: boolean; domain: string | null; created_at?: string | null; age_days?: number | null; registrar?: string | null }>
  hosting: Attempt<{ available: boolean; ip: string; network?: string | null; organization?: string | null; country?: string | null }>
  archive: Attempt<{ archived: boolean; archive_url?: string; timestamp?: string }>
  tools: Record<'domain' | 'hosting' | 'archive', string>
}

/** Aperçu d'une page web (balises Open Graph). Une publication de réseau social peut être « bloquée » (connexion exigée). */
export interface PageResult {
  available: boolean
  status?: number
  final_url?: string
  social: string | null
  blocked: boolean
  title?: string | null
  description?: string | null
  image?: string | null
  video?: string | null
  site_name?: string | null
  published_at?: string | null
  author?: string | null
  error?: string
  tool?: string
}

export interface FactCheckClaim {
  text: string | null
  claimant: string | null
  publisher: string | null
  url: string | null
  rating: string | null
  date: string | null
}

export type AssistFunction = 'draft' | 'angles' | 'headlines' | 'questions' | 'context'
export type AssistFormat = 'radio' | 'post' | 'article' | 'debunk'

export interface AssistRequest {
  function: AssistFunction
  format: AssistFormat
  language: 'fr' | 'mg' | 'en'
  claim: string
  excerpts: Array<{ id: string; text: string }>
}

/** Réponse de l'assistant, déjà passée au contrôle « zéro invention » du serveur. */
export interface AssistResult {
  model: string
  prompt_version: string
  prompt: string
  generated_at: string
  sentences: Array<{ text: string; citations: string[] }>
  removed: Array<{ text: string; reason: 'no_citation' | 'unknown_excerpt' | 'number_not_in_excerpts' | 'name_not_in_excerpts' | 'verdict'; detail: string }>
  missing: string[]
  compliant: boolean
  abstained: boolean
  abstention: string | null
  cited_excerpts: string[]
}

export interface FeedItem {
  title: string
  link: string
  summary: string
  published_at: string | null
  source: string
}

const postJson = (body: unknown) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })

export const analyseApi = {
  configured: BASE !== null,
  /** Un seul contrôle à la fois, partagé entre les écrans (et le double montage du mode strict de React). */
  health: () =>
    (pendingHealth ??= call<HealthResult>('/health', {}, 5000).finally(() => {
      pendingHealth = null
    })),
  provenance: (file: Blob) => call<ProvenanceResult>('/image/provenance', upload(file)),
  aiClue: (file: Blob) => call<AiClueResult>('/image/ai-clue', upload(file), 45000),
  video: (file: Blob) => call<VideoResult>('/video/analyse', upload(file), 120000),
  link: (url: string) =>
    call<LinkResult>('/link/analyse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) }),
  archive: (url: string) =>
    call<{ archived: boolean; archive_url?: string }>(
      '/link/archive',
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url }) },
      95000,
    ),
  assist: (request: AssistRequest) => call<AssistResult>('/ai/assist', postJson(request), 70000),
  feeds: (urls: string[]) => call<{ items: FeedItem[]; errors: Array<{ url: string; error: string }> }>('/veille/rss', postJson({ urls }), 60000),
  page: (url: string) => call<PageResult>('/link/page', postJson({ url }), 20000),
  /** Télécharge une image ou une vidéo publique par son adresse (le navigateur ne le peut pas : CORS). */
  fetchMedia: async (url: string, kind: 'image' | 'video'): Promise<File> => {
    const blob = await (await request('/media/fetch', postJson({ url, kind }), kind === 'video' ? 120000 : 45000)).blob()
    const name = decodeURIComponent(new URL(url).pathname.split('/').pop() || kind).slice(0, 80)
    return new File([blob], name, { type: blob.type })
  },
  factcheckImage: (url: string, language?: string) =>
    call<{ available: boolean; claims: FactCheckClaim[] }>(`/factcheck/image?${new URLSearchParams({ url, ...(language ? { language } : {}) })}`),
  factcheck: (query: string, language?: string) =>
    call<{ available: boolean; claims: FactCheckClaim[] }>(
      `/factcheck?${new URLSearchParams({ query, ...(language ? { language } : {}) })}`,
    ),
}
