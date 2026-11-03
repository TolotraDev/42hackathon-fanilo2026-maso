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

async function call<T>(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<T> {
  if (!BASE) throw new ServiceError('not_configured')
  if (typeof navigator !== 'undefined' && !navigator.onLine) throw new ServiceError('offline')
  let response: Response
  try {
    response = await fetch(`${BASE}${path}`, { ...init, signal: AbortSignal.timeout(timeoutMs) })
  } catch {
    throw new ServiceError(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'unreachable')
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null
    throw new ServiceError('rejected', body?.detail ?? String(response.status))
  }
  return (await response.json()) as T
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

export interface FactCheckClaim {
  text: string | null
  claimant: string | null
  publisher: string | null
  url: string | null
  rating: string | null
  date: string | null
}

export const analyseApi = {
  configured: BASE !== null,
  health: () => call<{ status: string; capabilities: Record<string, boolean> }>('/health', {}, 5000),
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
  factcheck: (query: string, language?: string) =>
    call<{ available: boolean; claims: FactCheckClaim[] }>(
      `/factcheck?${new URLSearchParams({ query, ...(language ? { language } : {}) })}`,
    ),
}
