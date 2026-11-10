import type { SupabaseClient } from '@supabase/supabase-js'
import type { AppNotification } from '#shared/types'
import type { NotificationDraft } from '#shared/domain/notifications'
import { NotificationDataSchema, NotificationKindSchema } from '#shared/schemas/notifications'
import { fromPostgresError } from '../errors'

interface NotificationRow {
  id: string
  kind: string
  run_id: string | null
  data: unknown
  created_at: string
  read_at: string | null
}

const SELECT = 'id, kind, run_id, data, created_at, read_at'

/** Unbekannte Arten oder kaputte Daten überspringen statt die ganze Liste scheitern zu lassen */
function rowToNotification(row: NotificationRow): AppNotification | null {
  const kind = NotificationKindSchema.safeParse(row.kind)
  const data = NotificationDataSchema.safeParse(row.data)
  if (!kind.success || !data.success) return null
  return {
    id: row.id,
    kind: kind.data,
    runId: row.run_id,
    data: data.data,
    createdAt: new Date(row.created_at).toISOString(),
    readAt: row.read_at ? new Date(row.read_at).toISOString() : null,
  }
}

export interface NotificationStore {
  /** neueste zuerst */
  list(memberId: string, limit: number): Promise<AppNotification[]>
  unreadCount(memberId: string): Promise<number>
  create(drafts: NotificationDraft[]): Promise<void>
  /** ohne ids: alle eigenen */
  markRead(memberId: string, ids?: string[]): Promise<void>
  purgeOlderThan(date: Date): Promise<number>
  deleteForMember(memberId: string): Promise<void>
}

export function createSupabaseNotificationStore(db: SupabaseClient): NotificationStore {
  const table = () => db.from('notifications')
  return {
    async list(memberId, limit) {
      const result = await table().select(SELECT).eq('member_id', memberId).order('created_at', { ascending: false }).limit(limit)
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as NotificationRow[]).map(rowToNotification).filter(entry => entry !== null)
    },
    async unreadCount(memberId) {
      const result = await table().select('id', { count: 'exact', head: true }).eq('member_id', memberId).is('read_at', null)
      if (result.error) throw fromPostgresError(result.error)
      return result.count ?? 0
    },
    async create(drafts) {
      if (!drafts.length) return
      const rows = drafts.map(draft => ({ member_id: draft.memberId, kind: draft.kind, run_id: draft.runId, data: draft.data }))
      const result = await table().insert(rows)
      if (result.error) throw fromPostgresError(result.error)
    },
    async markRead(memberId, ids) {
      let query = table().update({ read_at: new Date().toISOString() }).eq('member_id', memberId).is('read_at', null)
      if (ids) {
        if (!ids.length) return
        query = query.in('id', ids)
      }
      const result = await query
      if (result.error) throw fromPostgresError(result.error)
    },
    async purgeOlderThan(date) {
      const result = await table().delete({ count: 'exact' }).lt('created_at', date.toISOString())
      if (result.error) throw fromPostgresError(result.error)
      return result.count ?? 0
    },
    async deleteForMember(memberId) {
      const result = await table().delete().eq('member_id', memberId)
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
