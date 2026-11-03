import type { Language, Role } from '@/types/domain'

export const STAT_THEMES = ['demography', 'health', 'education', 'economy', 'climate', 'elections'] as const
export type StatTheme = (typeof STAT_THEMES)[number]

export const VISIBILITIES = ['public', 'team', 'private'] as const
export type Visibility = (typeof VISIBILITIES)[number]

export const CONFIRMATION_STATUSES = ['to_contact', 'sent', 'answered', 'reminder_needed', 'no_answer'] as const
export type ConfirmationStatus = (typeof CONFIRMATION_STATUSES)[number]

export const CHANNELS = ['phone', 'whatsapp', 'email', 'in_person'] as const
export type Channel = (typeof CHANNELS)[number]

export interface DirectoryPerson {
  id: string
  fullName: string
  position: string | null
  organization: string | null
  domains: string[]
  region: string | null
  languages: Language[]
  phone: string | null
  whatsapp: string | null
  email: string | null
  visibility: Visibility
  consent: boolean
  validated: boolean
  /** Jours depuis la dernière validation (null : jamais validée). */
  lastValidatedDaysAgo: number | null
  active: boolean
}

export interface PersonInput {
  fullName: string
  position: string
  organization: string
  domains: string[]
  region: string
  languages: Language[]
  phone: string
  whatsapp: string
  email: string
  visibility: Visibility
  consent: boolean
}

export interface PersonNote {
  favorite: boolean
  note: string
}

export interface ConfirmationRequest {
  id: string
  caseId: string
  caseTitle: string
  channel: Channel
  status: ConfirmationStatus
  response: string | null
  sentAt: string | null
  createdAt: string
}

export interface Indicator {
  id: string
  code: string | null
  theme: StatTheme
  name: string
  value: number
  unit: string | null
  year: number
  source: string
  sourceUrl: string | null
  sourceUpdatedAt: string
  validated: boolean
}

export type IndicatorInput = Omit<Indicator, 'id' | 'validated'>

export interface SourceSummary {
  id: string
  type: string
  name: string
  url: string | null
  domain: string | null
  score: number | null
  verified: boolean
}

/** Rôle qui gère les annuaires et les statistiques (section 3 : valider). */
export const canManageResources = (role: Role | null) => role === 'editor_in_chief' || role === 'admin'
