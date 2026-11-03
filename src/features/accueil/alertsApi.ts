// Signalements du public, côté équipe éditoriale : liste, fichier joint, prise en charge par un dossier.
import type { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_DB_NAME, LocalDb } from '@/features/dossiers/localDb'
import { alertBlobId, readLocalAlerts, writeLocalAlerts } from '@/features/portail/portalApi'
import type { TrackedStatus } from '@/features/portail/types'
import { supabase } from '@/lib/supabase'

export interface PublicAlert {
  id: string
  trackingCode: string
  text: string | null
  url: string | null
  platform: string | null
  region: string | null
  status: TrackedStatus
  occurrences: number
  sha256: string | null
  phash: string | null
  hasFile: boolean
  storagePath: string | null
  createdAt: string
}

export interface AlertsApi {
  list(): Promise<PublicAlert[]>
  get(id: string): Promise<PublicAlert | null>
  file(alert: PublicAlert): Promise<Blob | null>
  /** Mode démonstration seulement : sur le serveur, un trigger s'en charge à la création du dossier. */
  markTaken(alertId: string, caseId: string): Promise<void>
}

const COLUMNS = 'id, tracking_code, text, content_url, platform, region, status, occurrences, sha256, phash, storage_path, created_at'

const fromRow = (row: Record<string, unknown>): PublicAlert => ({
  id: row.id as string,
  trackingCode: row.tracking_code as string,
  text: (row.text as string) ?? null,
  url: (row.content_url as string) ?? null,
  platform: (row.platform as string) ?? null,
  region: (row.region as string) ?? null,
  status: row.status as TrackedStatus,
  occurrences: row.occurrences as number,
  sha256: (row.sha256 as string) ?? null,
  phash: (row.phash as string) ?? null,
  hasFile: Boolean(row.storage_path),
  storagePath: (row.storage_path as string) ?? null,
  createdAt: row.created_at as string,
})

function remoteAlerts(db: SupabaseClient): AlertsApi {
  return {
    async list() {
      const { data, error } = await db.from('alerts').select(COLUMNS).is('created_by', null).order('created_at', { ascending: false }).limit(20)
      if (error) throw error
      return (data ?? []).map(fromRow)
    },
    async get(id) {
      const { data, error } = await db.from('alerts').select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw error
      return data ? fromRow(data) : null
    },
    async file(alert) {
      if (!alert.storagePath) return null
      const { data, error } = await db.storage.from('signalements').download(alert.storagePath)
      return error ? null : data
    },
    async markTaken() {},
  }
}

function localAlerts(db: LocalDb): AlertsApi {
  const toPublic = (alert: Awaited<ReturnType<typeof readLocalAlerts>>[number]): PublicAlert => ({
    id: alert.id,
    trackingCode: alert.trackingCode,
    text: alert.text,
    url: alert.url,
    platform: alert.platform,
    region: alert.region,
    status: alert.status,
    occurrences: alert.occurrences,
    sha256: alert.sha256,
    phash: alert.phash,
    hasFile: alert.hasFile,
    storagePath: null,
    createdAt: alert.createdAt,
  })
  return {
    list: async () => (await readLocalAlerts(db)).slice(0, 20).map(toPublic),
    get: async (id) => {
      const alert = (await readLocalAlerts(db)).find((item) => item.id === id)
      return alert ? toPublic(alert) : null
    },
    file: async (alert) => (await db.blobs.get(alertBlobId(alert.id)))?.blob ?? null,
    async markTaken(alertId, caseId) {
      const alerts = await readLocalAlerts(db)
      await writeLocalAlerts(db, alerts.map((alert) => (alert.id === alertId && alert.status === 'new' ? { ...alert, status: 'in_progress', caseId } : alert)))
    },
  }
}

let shared: AlertsApi | null = null

export function alertsApi(): AlertsApi {
  shared ??= supabase ? remoteAlerts(supabase) : localAlerts(new LocalDb(DEMO_DB_NAME))
  return shared
}
