import type { SupabaseClient } from '@supabase/supabase-js'
import { fromPostgresError } from '../errors'

export type AnnouncementSubject = 'run' | 'guild_event'

export interface Announcement {
  channelId: string
  messageId: string
  /** Gruppen bekommen einen Thread (gleiche ID wie die Nachricht) */
  hasThread: boolean
}

interface AnnouncementRow {
  channel_id: string
  message_id: string
  has_thread: boolean
}

export interface AnnouncementStore {
  get(type: AnnouncementSubject, id: string): Promise<Announcement | null>
  save(type: AnnouncementSubject, id: string, announcement: Announcement): Promise<void>
  remove(type: AnnouncementSubject, id: string): Promise<void>
}

export function createSupabaseAnnouncementStore(db: SupabaseClient): AnnouncementStore {
  const table = () => db.from('discord_announcements')
  return {
    async get(type, id) {
      const result = await table().select('channel_id, message_id, has_thread').eq('subject_type', type).eq('subject_id', id).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      const row = result.data as AnnouncementRow | null
      return row ? { channelId: row.channel_id, messageId: row.message_id, hasThread: row.has_thread } : null
    },
    async save(type, id, announcement) {
      const result = await table().upsert({
        subject_type: type,
        subject_id: id,
        channel_id: announcement.channelId,
        message_id: announcement.messageId,
        has_thread: announcement.hasThread,
      })
      if (result.error) throw fromPostgresError(result.error)
    },
    async remove(type, id) {
      const result = await table().delete().eq('subject_type', type).eq('subject_id', id)
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
