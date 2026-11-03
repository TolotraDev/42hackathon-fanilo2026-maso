// W13 — Journal d'audit (ajout seul côté serveur) : qui, quoi, quand, avant / après.
import { supabase } from '@/lib/supabase'

export interface AuditEntry {
  id: number
  userId: string | null
  action: string
  entity: string
  entityId: string | null
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  createdAt: string
}

export interface AuditFilters {
  entity?: string
  action?: string
  from?: string
  to?: string
}

export const auditAvailable = () => supabase !== null

export async function listAudit(filters: AuditFilters, limit = 200): Promise<AuditEntry[]> {
  if (!supabase) return []
  let query = supabase.from('audit_logs').select('id, user_id, action, entity, entity_id, before, after, created_at').order('created_at', { ascending: false }).limit(limit)
  if (filters.entity) query = query.eq('entity', filters.entity)
  if (filters.action) query = query.eq('action', filters.action)
  if (filters.from) query = query.gte('created_at', filters.from)
  if (filters.to) query = query.lte('created_at', `${filters.to}T23:59:59`)
  const { data, error } = await query
  if (error) throw error
  return (data ?? []).map((row) => ({
    id: row.id as number,
    userId: (row.user_id as string) ?? null,
    action: row.action as string,
    entity: row.entity as string,
    entityId: (row.entity_id as string) ?? null,
    before: (row.before as Record<string, unknown>) ?? null,
    after: (row.after as Record<string, unknown>) ?? null,
    createdAt: row.created_at as string,
  }))
}

/** Champs modifiés entre « avant » et « après » (les dates techniques sont ignorées). */
export function changedFields(entry: Pick<AuditEntry, 'before' | 'after'>): Array<{ field: string; before: unknown; after: unknown }> {
  const keys = new Set([...Object.keys(entry.before ?? {}), ...Object.keys(entry.after ?? {})])
  const changes = []
  for (const key of keys) {
    if (key === 'updated_at' || key === 'created_at') continue
    const before = entry.before?.[key]
    const after = entry.after?.[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) changes.push({ field: key, before, after })
  }
  return changes
}
