// Accès du portail public (W0). Serveur : uniquement les fonctions portal_* (aucune table lue directement).
// Mode démonstration : rapports publiés et signalements conservés sur l'appareil, mêmes règles.
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_USERS } from '@/data/demo/users'
import { demoVerifyBadge } from '@/features/auth/demoAuth'
import { DEMO_DB_NAME, LocalDb } from '@/features/dossiers/localDb'
import { addLocalNotifications } from '@/features/notifications/notifications'
import { demoSeal } from '@/features/revue/publication'
import { hammingHex } from '@/lib/analysis/phash'
import { supabase } from '@/lib/supabase'
import { comparableUrl } from './comparableUrl'
import type { AlertInput, AlertReceipt, BadgeVerification, MatchReason, PublicReport, ReportCard, ReportFilters, Tracking, TrackedStatus, Verification } from './types'

export interface PortalApi {
  readonly mode: 'remote' | 'local'
  reports(filters: ReportFilters): Promise<ReportCard[]>
  report(publicId: string): Promise<PublicReport | null>
  verify(publicId: string): Promise<Verification>
  verifyBadge(code: string): Promise<BadgeVerification>
  lookup(input: { sha256?: string | null; phash?: string | null; url?: string | null }): Promise<ReportCard[]>
  submit(input: AlertInput): Promise<AlertReceipt>
  track(code: string): Promise<Tracking>
}

export class PortalError extends Error {
  constructor(public readonly code: string) {
    super(code)
  }
}

const FILE_EXTENSIONS: Record<string, 'jpg' | 'png' | 'webp'> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
export const MAX_ALERT_FILE_BYTES = 5 * 1024 * 1024

/** Contrôles communs au serveur (portal_submit_alert) et au mode démonstration. */
function validate(input: AlertInput) {
  const text = input.text.trim()
  const url = input.url.trim()
  if (!text && !url && !input.file) throw new PortalError('content_required')
  if (text.length > 2000 || url.length > 2048 || input.contact.length > 200) throw new PortalError('too_long')
  if (url && !/^https?:\/\/[^\s/]+\.[^\s]+$/i.test(url)) throw new PortalError('invalid_url')
  if (input.file && (!FILE_EXTENSIONS[input.file.type] || input.file.size > MAX_ALERT_FILE_BYTES)) throw new PortalError('invalid_file')
}

const codeOf = (error: { message?: string } | null) => {
  const message = error?.message ?? ''
  if (/^[a-z_]+$/.test(message)) return message
  if (/fetch|network|load failed/i.test(message)) return 'network'
  return 'unknown'
}

function remotePortal(db: SupabaseClient): PortalApi {
  const call = async <T,>(name: string, args: Record<string, unknown>): Promise<T> => {
    const { data, error } = await db.rpc(name, args)
    if (error) throw new PortalError(codeOf(error))
    return data as T
  }
  return {
    mode: 'remote',
    reports: (filters) =>
      call<ReportCard[]>('portal_reports', {
        p_query: filters.query || null,
        p_verdict: filters.verdict || null,
        p_theme: filters.theme || null,
        p_region: filters.region || null,
        p_language: filters.language || null,
        p_from: filters.from || null,
        p_to: filters.to || null,
        p_limit: filters.limit ?? 20,
        p_offset: filters.offset ?? 0,
      }),
    report: async (publicId) => (await call<PublicReport | null>('portal_report', { p_public_id: publicId })) ?? null,
    verify: (publicId) => call<Verification>('portal_verify_report', { p_public_id: publicId }),
    verifyBadge: (code) => call<BadgeVerification>('portal_verify_badge', { p_code: code }),
    lookup: (input) => call<ReportCard[]>('portal_lookup', { p_sha256: input.sha256 ?? null, p_phash: input.phash ?? null, p_url: input.url || null }),
    async submit(input) {
      validate(input)
      const receipt = await call<AlertReceipt>('portal_submit_alert', {
        p_text: input.text.trim() || null,
        p_url: input.url.trim() || null,
        p_platform: input.platform || null,
        p_region: input.region || null,
        p_language: input.language,
        p_contact: input.contact.trim() || null,
        p_sha256: input.file ? input.sha256 : null,
        p_phash: input.file ? input.phash : null,
        p_file_ext: input.file ? FILE_EXTENSIONS[input.file.type] : null,
        p_trap: input.trap || null,
      })
      if (receipt.upload_path && input.file) {
        const { error } = await db.storage.from('signalements').upload(receipt.upload_path, input.file, { contentType: input.file.type, upsert: false })
        if (error) throw new PortalError('upload_failed')
      }
      return receipt
    },
    track: (code) => call<Tracking>('portal_track', { p_code: code }),
  }
}

// ─── Mode démonstration ─────────────────────────────────────────────────────

export interface LocalAlert {
  id: string
  trackingCode: string
  text: string | null
  url: string | null
  platform: string | null
  region: string | null
  language: string
  contact: string | null
  sha256: string | null
  phash: string | null
  hasFile: boolean
  status: TrackedStatus
  occurrences: number
  caseId: string | null
  createdAt: string
}

const ALERTS_KEY = 'alerts'
export const alertBlobId = (alertId: string) => `alert-${alertId}`

export async function readLocalAlerts(db: LocalDb): Promise<LocalAlert[]> {
  return ((await db.meta.get(ALERTS_KEY))?.value as LocalAlert[] | undefined) ?? []
}

export async function writeLocalAlerts(db: LocalDb, alerts: LocalAlert[]): Promise<void> {
  await db.meta.put({ key: ALERTS_KEY, value: alerts })
}

function cardOf(report: PublicReport, reason?: MatchReason): ReportCard {
  return {
    public_id: report.public_id,
    title: report.title,
    claim: report.claim,
    verdict: report.verdict,
    summary: report.summary,
    theme: report.theme,
    region: report.region,
    language: report.language,
    newsroom: report.newsroom,
    published_at: report.published_at,
    corrected: report.corrections.length > 0,
    ...(reason ? { reason } : {}),
  }
}

const trackingCode = () => crypto.randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()

export function localPortal(db: LocalDb = new LocalDb(DEMO_DB_NAME)): PortalApi {
  async function published() {
    return (await db.cases.toArray())
      .map((stored) => stored.detail)
      .filter((detail) => detail.report?.status === 'published' && detail.report.signedPayload)
      .map((detail) => ({
        detail,
        report: {
          ...(detail.report!.signedPayload as unknown as PublicReport),
          signature: detail.report!.signature ?? undefined,
          content_hash: detail.report!.contentHash ?? undefined,
          signed_at: detail.report!.signedAt ?? undefined,
        },
      }))
      .sort((a, b) => b.report.published_at.localeCompare(a.report.published_at))
  }

  async function lookup(input: { sha256?: string | null; phash?: string | null; url?: string | null }) {
    const url = comparableUrl(input.url)
    const matches: ReportCard[] = []
    for (const { detail, report } of await published()) {
      let reason: MatchReason | null = null
      for (const evidence of detail.evidences) {
        if (input.sha256 && evidence.sha256 === input.sha256) reason = 'same_file'
        else if (url && [comparableUrl(evidence.url), comparableUrl(evidence.archiveUrl)].includes(url)) reason ??= 'same_link'
        else if (input.phash && evidence.phash && hammingHex(input.phash, evidence.phash) <= 10) reason ??= 'similar_image'
      }
      if (reason) matches.push(cardOf(report, reason))
    }
    return matches.slice(0, 5)
  }

  return {
    mode: 'local',
    async reports(filters) {
      const query = filters.query?.trim().toLowerCase() ?? ''
      return (await published())
        .map(({ report }) => report)
        .filter(
          (report) =>
            (!query || `${report.title} ${report.claim} ${report.summary} ${report.public_id}`.toLowerCase().includes(query)) &&
            (!filters.verdict || report.verdict === filters.verdict) &&
            (!filters.theme || report.theme?.toLowerCase() === filters.theme.toLowerCase()) &&
            (!filters.region || report.region?.toLowerCase() === filters.region.toLowerCase()) &&
            (!filters.language || report.language === filters.language) &&
            (!filters.from || report.published_at.slice(0, 10) >= filters.from) &&
            (!filters.to || report.published_at.slice(0, 10) <= filters.to),
        )
        .slice(filters.offset ?? 0, (filters.offset ?? 0) + (filters.limit ?? 20))
        .map((report) => cardOf(report))
    },
    async report(publicId) {
      return (await published()).find(({ report }) => report.public_id === publicId.trim().toUpperCase())?.report ?? null
    },
    async verifyBadge(code) {
      return demoVerifyBadge(code)
    },
    async verify(publicId) {
      const found = (await published()).find(({ report }) => report.public_id === publicId.trim().toUpperCase())
      if (!found) return { found: false }
      const payload = found.detail.report!.signedPayload!
      const seal = await demoSeal(payload)
      return {
        found: true,
        valid: seal.signature === found.report.signature && seal.contentHash === found.report.content_hash,
        public_id: found.report.public_id,
        title: found.report.title,
        verdict: found.report.verdict,
        newsroom: found.report.newsroom,
        published_at: found.report.published_at,
        signed_at: found.report.signed_at,
        content_hash: found.report.content_hash,
      }
    },
    lookup,
    async submit(input) {
      validate(input)
      if (input.trap) return { tracking_code: trackingCode(), duplicate: false, upload_path: null, matches: [] }
      const text = input.text.trim() || null
      const url = input.url.trim() || null
      const sha256 = input.file ? input.sha256 : null
      const matches = await lookup({ sha256, phash: input.file ? input.phash : null, url })
      const alerts = await readLocalAlerts(db)
      const since = new Date(Date.now() - 30 * 86400000).toISOString()
      const existing = alerts.find(
        (alert) =>
          alert.createdAt > since &&
          ((sha256 && alert.sha256 === sha256) ||
            (url && comparableUrl(alert.url) === comparableUrl(url)) ||
            (!sha256 && !url && text && alert.text?.toLowerCase() === text.toLowerCase())),
      )
      if (existing) {
        await writeLocalAlerts(db, alerts.map((alert) => (alert.id === existing.id ? { ...alert, occurrences: alert.occurrences + 1 } : alert)))
        return { tracking_code: existing.trackingCode, duplicate: true, upload_path: null, matches }
      }
      const alert: LocalAlert = {
        id: crypto.randomUUID(),
        trackingCode: trackingCode(),
        text,
        url,
        platform: input.platform || null,
        region: input.region || null,
        language: input.language,
        contact: input.contact.trim() || null,
        sha256,
        phash: input.file ? input.phash : null,
        hasFile: Boolean(input.file),
        status: 'new',
        occurrences: 1,
        caseId: null,
        createdAt: new Date().toISOString(),
      }
      if (input.file) await db.blobs.put({ id: alertBlobId(alert.id), blob: input.file })
      await writeLocalAlerts(db, [alert, ...alerts])
      await addLocalNotifications(
        db,
        DEMO_USERS.filter((user) => user.role === 'journalist' || user.role === 'editor_in_chief').map((user) => ({
          userId: user.id,
          kind: 'public_report' as const,
          caseId: null,
          actorId: null,
          body: (text ?? url ?? '').slice(0, 280),
          readAt: null,
          createdAt: alert.createdAt,
        })),
      )
      return { tracking_code: alert.trackingCode, duplicate: false, upload_path: null, matches }
    },
    async track(code) {
      const alert = (await readLocalAlerts(db)).find((item) => item.trackingCode === code.trim().toUpperCase())
      if (!alert) return { found: false }
      const report = alert.caseId ? (await published()).find(({ detail }) => detail.case.id === alert.caseId)?.report : undefined
      const status: TrackedStatus = report ? (['confirmed', 'mostly_true'].includes(report.verdict) ? 'verified' : 'debunked') : alert.status
      return { found: true, status, received_at: alert.createdAt, report: report ? cardOf(report) : null }
    },
  }
}

let shared: PortalApi | null = null

/** Portail du serveur configuré, ou du mode démonstration. */
export function portalApi(): PortalApi {
  shared ??= supabase ? remotePortal(supabase) : localPortal()
  return shared
}
