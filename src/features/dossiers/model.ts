// Modèle d'un dossier tel qu'il est conservé sur l'appareil (lecture hors ligne) et envoyé au serveur.
import type { CaseStatus, ChecklistBlock, ChecklistState, ConfidenceLevel, Language, Verdict } from '@/types/domain'

export interface CaseRecord {
  id: string
  title: string
  claim: string
  category: string | null
  region: string | null
  priority: 1 | 2 | 3
  status: CaseStatus
  assignedTo: string | null
  createdBy: string | null
  dueDate: string | null
  verdict: Verdict | null
  confidence: ConfidenceLevel | null
  justification: string | null
  justificationEvidenceIds: string[]
  proposedBy: string | null
  /** Signalement du public ou alerte de veille à l'origine du dossier. */
  alertId?: string | null
  createdAt: string
  updatedAt: string
  /** Avancement de la checklist (points faits ou non applicables / total). */
  checklistDone: number
  checklistTotal: number
}

export interface EvidenceRecord {
  id: string
  type: 'image' | 'video' | 'link' | 'screenshot' | 'document' | 'text' | 'analysis'
  url: string | null
  archiveUrl: string | null
  storagePath: string | null
  sha256: string | null
  phash: string | null
  origin: string | null
  analysis: Record<string, unknown> | null
  addedBy: string | null
  createdAt: string
  /** Fichier encore sur l'appareil, en attente d'envoi. */
  localBlobId?: string | null
}

export interface ChecklistItem {
  id: string
  block: ChecklistBlock
  question: string
  sortOrder: number
  state: ChecklistState
  explanation: string
  evidenceIds: string[]
  authorId: string | null
  updatedAt: string
}

export interface LinkedSource {
  id: string
  name: string
  type: string
  domain: string | null
  score: number | null
  verified: boolean
}

export interface HistoryEntry {
  fromStatus: CaseStatus
  toStatus: CaseStatus
  reason: string
  changedBy: string | null
  changedAt: string
}

export interface CaseComment {
  id: string
  body: string
  authorId: string | null
  createdAt: string
  /** Membres mentionnés (@) : ils reçoivent une notification. */
  mentions?: string[]
}

export interface CaseRequest {
  id: string
  personId: string | null
  personName: string
  channel: string
  status: string
  response: string | null
}

/** Affirmation du rapport et preuves qui l'étayent (W6 : une affirmation sans preuve est signalée). */
export interface ReportClaim {
  text: string
  evidenceIds: string[]
}

export interface ReportCorrection {
  at: string
  text: string
}

export interface ReportDraft {
  id: string
  language: Language
  summary: string
  explanation: string
  method: string
  claims: ReportClaim[]
  /** Preuves montrées au public sur la page du rapport. */
  publicEvidenceIds: string[]
  status: 'draft' | 'submitted' | 'validated' | 'published' | 'retracted'
  updatedAt: string
  version?: number
  /** Après publication : numéro public, signature et contenu signé. */
  publicId?: string | null
  signature?: string | null
  contentHash?: string | null
  signedAt?: string | null
  publishedAt?: string | null
  corrections?: ReportCorrection[]
  signedPayload?: Record<string, unknown> | null
}

/** Version précédente du rapport, conservée à chaque modification (comparaison en revue). */
export interface ReportVersion {
  version: number
  summary: string
  explanation: string
  method: string
  claims: ReportClaim[]
  authorId: string | null
  createdAt: string
}

export const DECISION_TYPES = ['validate_publish', 'request_correction', 'request_verification', 'reject'] as const
export type DecisionType = (typeof DECISION_TYPES)[number]

export interface EditorialDecision {
  type: DecisionType
  comment: string
  authorId: string | null
  createdAt: string
}

export interface CaseDetail {
  case: CaseRecord
  evidences: EvidenceRecord[]
  checklist: ChecklistItem[]
  sources: LinkedSource[]
  history: HistoryEntry[]
  comments: CaseComment[]
  requests: CaseRequest[]
  report: ReportDraft | null
  reportVersions: ReportVersion[]
  decisions: EditorialDecision[]
}

export interface NewCaseInput {
  title: string
  claim: string
  category: string
  region: string
  priority: 1 | 2 | 3
  dueDate: string | null
  alertId?: string | null
}

export type CasePatch = Partial<Pick<CaseRecord, 'title' | 'claim' | 'category' | 'region' | 'priority' | 'dueDate' | 'assignedTo'>>

/** Modification en attente d'envoi au serveur (file de synchronisation). */
export type Mutation =
  | { kind: 'create_case'; caseId: string; input: NewCaseInput }
  | { kind: 'update_case'; caseId: string; patch: CasePatch }
  | { kind: 'set_checklist'; caseId: string; question: string; state: ChecklistState; explanation: string; evidenceIds: string[] }
  | { kind: 'change_status'; caseId: string; to: CaseStatus; reason: string }
  | { kind: 'propose_verdict'; caseId: string; verdict: Verdict; confidence: ConfidenceLevel; justification: string; evidenceIds: string[] }
  | { kind: 'add_evidence'; caseId: string; evidence: EvidenceRecord }
  | { kind: 'link_source'; caseId: string; source: LinkedSource }
  | { kind: 'unlink_source'; caseId: string; sourceId: string }
  | { kind: 'save_report'; caseId: string; report: ReportDraft }
  | { kind: 'add_comment'; caseId: string; comment: CaseComment }
  // Revue éditoriale (MOD-06) : jamais mises en file d'attente, elles exigent le réseau (signature serveur).
  | { kind: 'editorial_decision'; caseId: string; decision: DecisionType; comment: string }
  | { kind: 'add_correction'; caseId: string; text: string }

export type SyncState = 'synced' | 'pending' | 'error'
