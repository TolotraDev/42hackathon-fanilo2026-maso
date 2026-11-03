// Données du portail public (W0), telles que renvoyées par les fonctions portal_* du serveur.
// Rien d'interne n'y figure : uniquement le contenu signé du rapport publié.
import type { ConfidenceLevel, Language, Verdict } from '@/types/domain'

export interface PublicEvidence {
  label: string
  type: string
  url: string | null
  archive_url: string | null
  sha256: string | null
  origin: string | null
  added_at: string
  /** Fichier de la preuve (photo, vidéo) dans le stockage, lisible par le public une fois publié. */
  storage_path?: string | null
}

export interface PublicReport {
  public_id: string
  language: Language
  title: string
  claim: string
  verdict: Verdict
  confidence: ConfidenceLevel | null
  theme: string | null
  region: string | null
  summary: string
  explanation: string
  method: string
  claims: Array<{ text: string; evidence: string[] }>
  evidences: PublicEvidence[]
  newsroom: string
  validated_by: string | null
  published_at: string
  corrections: Array<{ at: string; text: string }>
  /** Ajoutés par portal_report : preuve d'authenticité. */
  signature?: string
  content_hash?: string
  signed_at?: string
}

export type MatchReason = 'same_file' | 'similar_image' | 'same_link'

export interface ReportCard {
  public_id: string
  title: string
  claim: string
  verdict: Verdict
  summary: string
  theme: string | null
  region: string | null
  language: Language
  newsroom: string
  published_at: string
  corrected: boolean
  reason?: MatchReason
}

export interface ReportFilters {
  query?: string
  verdict?: Verdict | ''
  theme?: string
  region?: string
  language?: Language | ''
  from?: string
  to?: string
  limit?: number
  offset?: number
}

export interface Verification {
  found: boolean
  valid?: boolean
  public_id?: string
  title?: string
  verdict?: Verdict
  newsroom?: string
  published_at?: string
  signed_at?: string
  content_hash?: string
}

/** Vérification publique d'un badge de journaliste (W0) : le minimum pour l'identifier. */
export interface BadgeVerification {
  found: boolean
  status?: 'valid' | 'revoked' | 'expired' | 'suspended'
  full_name?: string
  role?: string
  newsroom?: string | null
  valid_until?: string
  code?: string
}

export interface AlertInput {
  text: string
  url: string
  platform: string
  region: string
  language: Language
  contact: string
  file: File | null
  sha256: string | null
  phash: string | null
  /** Champ piège invisible : rempli seulement par les robots. */
  trap: string
}

export interface AlertReceipt {
  tracking_code: string
  duplicate: boolean
  upload_path: string | null
  matches: ReportCard[]
}

export type TrackedStatus = 'new' | 'in_progress' | 'verified' | 'debunked'

export interface Tracking {
  found: boolean
  status?: TrackedStatus
  received_at?: string
  report?: ReportCard | null
}
