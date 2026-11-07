import type { SupabaseClient } from '@supabase/supabase-js'
import type { ActivityEntry } from '#shared/schemas/admin'
import { fromPostgresError } from '../errors'

export interface ActivityInput {
  action: string
  actorId: string | null
  subjectType: ActivityEntry['subjectType']
  subjectId: string | null
  summary: string
}

export interface ActivityStore {
  record(entry: ActivityInput, retainUntil: Date): Promise<void>
  list(options: { limit: number, before?: number }): Promise<ActivityEntry[]>
  /** Abgelaufene Einträge löschen; gibt die Anzahl zurück */
  purgeExpired(now: Date): Promise<number>
}

interface ActivityRow {
  id: number
  occurred_at: string
  action: string
  actor_id: string | null
  subject_type: ActivityEntry['subjectType']
  subject_id: string | null
  summary: string
}

/** Aktivitätsprotokoll (Tabelle `activity_log`) */
export function createSupabaseActivityStore(db: SupabaseClient): ActivityStore {
  const table = () => db.from('activity_log')
  return {
    async record(entry, retainUntil) {
      const result = await table().insert({
        action: entry.action,
        actor_id: entry.actorId,
        subject_type: entry.subjectType,
        subject_id: entry.subjectId,
        summary: entry.summary.slice(0, 200),
        retain_until: retainUntil.toISOString(),
      })
      if (result.error) throw fromPostgresError(result.error)
    },
    async list({ limit, before }) {
      let query = table().select('id, occurred_at, action, actor_id, subject_type, subject_id, summary').order('id', { ascending: false }).limit(limit)
      if (before) query = query.lt('id', before)
      const result = await query
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as ActivityRow[]).map(row => ({
        id: row.id,
        occurredAt: new Date(row.occurred_at).toISOString(),
        action: row.action,
        actorId: row.actor_id,
        subjectType: row.subject_type,
        subjectId: row.subject_id,
        summary: row.summary,
      }))
    },
    async purgeExpired(now) {
      const result = await table().delete().lt('retain_until', now.toISOString()).select('id')
      if (result.error) throw fromPostgresError(result.error)
      return (result.data ?? []).length
    },
  }
}
