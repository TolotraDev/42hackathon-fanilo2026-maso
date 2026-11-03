// Notifications (section 12) : affectation, demande de relecture, correction demandée, publication, mention…
// Serveur : créées par des triggers (202611021800_publication.sql), lues par chacun pour lui seul.
// Mode démonstration : mêmes règles, appliquées sur l'appareil (base partagée par les comptes de démo).
import type { SupabaseClient } from '@supabase/supabase-js'
import type { CaseDetail, Mutation } from '@/features/dossiers/model'
import type { LocalDb } from '@/features/dossiers/localDb'

export const NOTIFICATION_KINDS = [
  'assigned',
  'review_requested',
  'correction_requested',
  'verification_requested',
  'rejected',
  'validated',
  'published',
  'mentioned',
  'public_report',
] as const
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number]

export interface AppNotification {
  id: string
  userId: string
  kind: NotificationKind
  caseId: string | null
  actorId: string | null
  body: string | null
  readAt: string | null
  createdAt: string
}

export interface NotificationsApi {
  list(): Promise<AppNotification[]>
  markRead(ids: string[]): Promise<void>
}

interface Member {
  id: string
  role: string
}

const STAFF = ['journalist', 'fact_checker', 'editor_in_chief']

/** Destinataires : membres actifs de l'équipe éditoriale, jamais l'auteur de l'action (copie de private.notify). */
function recipients(ids: Array<string | null>, members: Member[], actorId: string | null): string[] {
  return [...new Set(ids)].filter(
    (id): id is string => id !== null && id !== actorId && members.some((member) => member.id === id && STAFF.includes(member.role)),
  )
}

/** Notifications produites par une modification d'un dossier — copie des triggers notify_*. */
export function notificationsFor(
  before: CaseDetail | null,
  after: CaseDetail,
  mutation: Mutation,
  actorId: string | null,
  members: Member[],
  now: string,
): Omit<AppNotification, 'id'>[] {
  const make = (users: string[], kind: NotificationKind, body: string | null) =>
    users.map((userId) => ({ userId, kind, caseId: after.case.id, actorId, body: body?.slice(0, 280) ?? null, readAt: null, createdAt: now }))
  const record = after.case
  const team = [record.createdBy, record.assignedTo, record.proposedBy]
  const out: Omit<AppNotification, 'id'>[] = []

  if (mutation.kind === 'update_case' && mutation.patch.assignedTo && mutation.patch.assignedTo !== before?.case.assignedTo) {
    out.push(...make(recipients([mutation.patch.assignedTo], members, actorId), 'assigned', record.title))
  }
  if (mutation.kind === 'add_comment' && mutation.comment.mentions?.length) {
    out.push(...make(recipients(mutation.comment.mentions, members, actorId), 'mentioned', mutation.comment.body))
  }
  const from = before?.case.status
  const to = record.status
  if (from && from !== to) {
    const reason = after.history.at(-1)?.reason ?? null
    const editors = members.filter((member) => member.role === 'editor_in_chief').map((member) => member.id)
    if (to === 'to_review') out.push(...make(recipients(editors, members, actorId), 'review_requested', record.title))
    else if (to === 'correction_requested') out.push(...make(recipients(team, members, actorId), 'correction_requested', reason))
    else if (to === 'in_analysis' && from === 'to_review') out.push(...make(recipients(team, members, actorId), 'verification_requested', reason))
    else if (to === 'closed' && from === 'to_review') out.push(...make(recipients(team, members, actorId), 'rejected', reason))
    else if (to === 'validated') out.push(...make(recipients(team, members, actorId), 'validated', record.title))
    else if (to === 'published') out.push(...make(recipients(team, members, actorId), 'published', record.title))
  }
  return out
}

const fromRow = (row: Record<string, unknown>): AppNotification => ({
  id: row.id as string,
  userId: row.user_id as string,
  kind: row.kind as NotificationKind,
  caseId: (row.case_id as string) ?? null,
  actorId: (row.actor_id as string) ?? null,
  body: (row.body as string) ?? null,
  readAt: (row.read_at as string) ?? null,
  createdAt: row.created_at as string,
})

export function remoteNotifications(db: SupabaseClient): NotificationsApi {
  return {
    async list() {
      const { data, error } = await db.from('notifications').select('*').order('created_at', { ascending: false }).limit(50)
      if (error) throw error
      return (data ?? []).map(fromRow)
    },
    async markRead(ids) {
      if (!ids.length) return
      const { error } = await db.from('notifications').update({ read_at: new Date().toISOString() }).in('id', ids)
      if (error) throw error
    },
  }
}

const KEY = 'notifications'

export async function addLocalNotifications(db: LocalDb, items: Omit<AppNotification, 'id'>[]): Promise<void> {
  if (!items.length) return
  const current = ((await db.meta.get(KEY))?.value as AppNotification[] | undefined) ?? []
  const added = items.map((item) => ({ ...item, id: crypto.randomUUID() }))
  await db.meta.put({ key: KEY, value: [...added, ...current].slice(0, 300) })
}

export function localNotifications(db: LocalDb, userId: string): NotificationsApi {
  const all = async () => ((await db.meta.get(KEY))?.value as AppNotification[] | undefined) ?? []
  return {
    async list() {
      return (await all()).filter((item) => item.userId === userId).slice(0, 50)
    },
    async markRead(ids) {
      const now = new Date().toISOString()
      await db.meta.put({ key: KEY, value: (await all()).map((item) => (ids.includes(item.id) && item.userId === userId ? { ...item, readAt: item.readAt ?? now } : item)) })
    },
  }
}
