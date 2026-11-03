// Données des ressources (MOD-04). Avec Supabase : base partagée de l'équipe.
// En mode démonstration : données intégrées en lecture seule, favoris et notes sur l'appareil.
import { DEMO_DIRECTORY, DEMO_INDICATORS, DEMO_SOURCES } from '@/data/demo/resources'
import { toAuthFailure } from '@/features/auth/supabaseErrors'
import { NotConfigured } from '@/features/verifier/verificationApi'
import { readStorage, writeStorage } from '@/lib/storage'
import { supabase } from '@/lib/supabase'
import type { Language, Role } from '@/types/domain'
import { contactsVisible } from './rules'
import type {
  Channel,
  ConfirmationRequest,
  ConfirmationStatus,
  DirectoryPerson,
  Indicator,
  IndicatorInput,
  PersonInput,
  PersonNote,
  SourceSummary,
  Visibility,
} from './types'

function db() {
  if (!supabase) throw new NotConfigured()
  return supabase
}

function check<T>(result: { data: T; error: { message: string; code?: string } | null }): T {
  if (result.error) throw toAuthFailure(result.error)
  return result.data
}

const daysSince = (iso: string | null) => (iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null)

// ─── Annuaire des personnes-ressources ─────────────────────────────────────

interface PersonRow {
  id: string
  full_name: string
  position: string | null
  organization: string | null
  domains: string[]
  region: string | null
  languages: Language[]
  phone?: string | null
  whatsapp?: string | null
  email?: string | null
  visibility?: Visibility
  consent?: boolean
  validated?: boolean
  active?: boolean
  last_validated_at: string | null
}

const toPerson = (row: PersonRow): DirectoryPerson => ({
  id: row.id,
  fullName: row.full_name,
  position: row.position,
  organization: row.organization,
  domains: row.domains ?? [],
  region: row.region,
  languages: row.languages ?? [],
  phone: row.phone ?? null,
  whatsapp: row.whatsapp ?? null,
  email: row.email ?? null,
  visibility: row.visibility ?? 'public',
  consent: row.consent ?? true,
  validated: row.validated ?? true,
  active: row.active ?? true,
  lastValidatedDaysAgo: daysSince(row.last_validated_at),
})

/** Annuaire visible par le rôle : coordonnées masquées selon la visibilité consentie. */
export async function listDirectory(role: Role | null): Promise<DirectoryPerson[]> {
  if (!supabase) {
    return DEMO_DIRECTORY.filter((person) => role !== 'public' || person.visibility === 'public').map((person) =>
      contactsVisible(person.visibility, role) ? person : { ...person, phone: null, whatsapp: null, email: null },
    )
  }
  const view = role === 'public' ? 'resource_people_public' : 'resource_people_directory'
  const rows = check(await db().from(view).select('*').order('full_name')) as PersonRow[]
  return rows.map(toPerson)
}

const toRow = (input: PersonInput) => ({
  full_name: input.fullName.trim(),
  position: input.position.trim() || null,
  organization: input.organization.trim() || null,
  domains: input.domains,
  region: input.region.trim() || null,
  languages: input.languages,
  phone: input.phone.trim() || null,
  whatsapp: input.whatsapp.trim() || null,
  email: input.email.trim() || null,
  visibility: input.visibility,
  consent: input.consent,
  consent_at: input.consent ? new Date().toISOString() : null,
})

/** Proposition (journaliste) ou ajout validé directement (rédacteur en chef, admin). */
export async function createPerson(input: PersonInput, validate: boolean): Promise<string> {
  const { id } = check(await db().from('resource_people').insert(toRow(input)).select('id').single()) as { id: string }
  if (validate && input.consent) await validatePerson(id)
  return id
}

export async function updatePerson(id: string, input: PersonInput): Promise<void> {
  check(await db().from('resource_people').update(toRow(input)).eq('id', id))
}

export async function validatePerson(id: string): Promise<void> {
  check(await db().rpc('validate_resource_person', { p_person_id: id }))
}

export async function withdrawPerson(id: string): Promise<void> {
  check(await db().rpc('withdraw_resource_person', { p_person_id: id }))
}

// ─── Favoris et notes privées ──────────────────────────────────────────────

const DEMO_NOTES_KEY = 'maso.demo.notes'

export async function listNotes(): Promise<Record<string, PersonNote>> {
  if (!supabase) {
    try {
      return JSON.parse(readStorage(DEMO_NOTES_KEY) ?? '{}') as Record<string, PersonNote>
    } catch {
      return {}
    }
  }
  const rows = check(await db().from('resource_person_notes').select('person_id, favorite, note')) as Array<{
    person_id: string
    favorite: boolean
    note: string
  }>
  return Object.fromEntries(rows.map((row) => [row.person_id, { favorite: row.favorite, note: row.note }]))
}

export async function saveNote(personId: string, value: PersonNote): Promise<void> {
  if (!supabase) {
    const notes = await listNotes()
    writeStorage(DEMO_NOTES_KEY, JSON.stringify({ ...notes, [personId]: value }))
    return
  }
  check(await db().from('resource_person_notes').upsert({ person_id: personId, favorite: value.favorite, note: value.note }))
}

// ─── Demandes de confirmation ──────────────────────────────────────────────

interface ConfirmationRow {
  id: string
  case_id: string
  channel: Channel
  status: ConfirmationStatus
  response: string | null
  sent_at: string | null
  created_at: string
  case: { title: string } | null
}

export async function listConfirmations(personId: string): Promise<ConfirmationRequest[]> {
  const rows = check(
    await db()
      .from('confirmation_requests')
      .select('id, case_id, channel, status, response, sent_at, created_at, case:cases(title)')
      .eq('person_id', personId)
      .order('created_at', { ascending: false }),
  ) as unknown as ConfirmationRow[]
  return rows.map((row) => ({
    id: row.id,
    caseId: row.case_id,
    caseTitle: row.case?.title ?? '—',
    channel: row.channel,
    status: row.status,
    response: row.response,
    sentAt: row.sent_at,
    createdAt: row.created_at,
  }))
}

export async function createConfirmation(personId: string, caseId: string, channel: Channel): Promise<void> {
  check(await db().from('confirmation_requests').insert({ person_id: personId, case_id: caseId, channel, status: 'to_contact' }))
}

export async function updateConfirmation(id: string, status: ConfirmationStatus, response: string): Promise<void> {
  check(
    await db()
      .from('confirmation_requests')
      .update({
        status,
        response: response.trim() || null,
        ...(status === 'sent' ? { sent_at: new Date().toISOString() } : {}),
        ...(status === 'reminder_needed' ? { reminder_at: new Date().toISOString() } : {}),
      })
      .eq('id', id),
  )
}

// ─── Statistiques ──────────────────────────────────────────────────────────

interface IndicatorRow {
  id: string
  code: string | null
  theme: Indicator['theme']
  name: string
  value: number
  unit: string | null
  year: number
  source: string
  source_url: string | null
  source_updated_at: string
  validated: boolean
}

export async function listIndicators(): Promise<Indicator[]> {
  if (!supabase) return DEMO_INDICATORS
  const rows = check(await db().from('statistic_indicators').select('*').order('theme').order('name').order('year')) as IndicatorRow[]
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    theme: row.theme,
    name: row.name,
    value: Number(row.value),
    unit: row.unit,
    year: row.year,
    source: row.source,
    sourceUrl: row.source_url,
    sourceUpdatedAt: row.source_updated_at,
    validated: row.validated,
  }))
}

/** Ajoute des indicateurs en ignorant ceux déjà présents (même code et même année). Renvoie le nombre ajouté. */
export async function addIndicators(inputs: IndicatorInput[]): Promise<number> {
  const existing = await listIndicators()
  const known = new Set(existing.filter((item) => item.code).map((item) => `${item.code}|${item.year}`))
  const fresh = inputs.filter((input) => !input.code || !known.has(`${input.code}|${input.year}`))
  if (fresh.length === 0) return 0
  check(
    await db()
      .from('statistic_indicators')
      .insert(
        fresh.map((input) => ({
          code: input.code,
          theme: input.theme,
          name: input.name.trim(),
          value: input.value,
          unit: input.unit?.trim() || null,
          year: input.year,
          source: input.source.trim(),
          source_url: input.sourceUrl?.trim() || null,
          source_updated_at: input.sourceUpdatedAt,
        })),
      ),
  )
  return fresh.length
}

export async function validateIndicator(id: string): Promise<void> {
  check(await db().from('statistic_indicators').update({ validated: true }).eq('id', id))
}

// ─── Annuaire des médias et sources (W8) ───────────────────────────────────

export async function listSources(): Promise<SourceSummary[]> {
  if (!supabase) return DEMO_SOURCES
  const rows = check(
    await db().from('sources').select('id, type, name, url, domain, score, verified').order('name'),
  ) as Array<Omit<SourceSummary, 'score'> & { score: number | string | null }>
  return rows.map((row) => ({ ...row, score: row.score === null ? null : Number(row.score) }))
}

export async function addSources(rows: Array<{ type: string; name: string; url: string | null; created_on: string | null }>): Promise<number> {
  if (rows.length === 0) return 0
  check(await db().from('sources').insert(rows))
  return rows.length
}
