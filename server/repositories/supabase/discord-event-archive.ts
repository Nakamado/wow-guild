import type { SupabaseClient } from '@supabase/supabase-js'
import type { DiscordEvent } from '#shared/types'
import { EventStatusSchema } from '#shared/schemas/events'
import { fromPostgresError } from '../errors'

interface ArchiveRow {
  id: string
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  status: string
  url: string | null
  site_cancelled: boolean
  site_cancel_reason: string | null
  location?: string | null
  stream_checked?: boolean
  auto_cancelled?: boolean
}

/** Archiviertes Event inkl. Prüfstatus „hat der Stream stattgefunden?“ */
export type ArchivedDiscordEvent = DiscordEvent & { streamChecked: boolean }

export interface DiscordEventArchive {
  /** gesehene Events speichern bzw. aktualisieren */
  save(events: DiscordEvent[]): Promise<void>
  /** archivierte Events (ohne Veranstalter-Namen), inkl. Absage auf der Webseite */
  list(): Promise<ArchivedDiscordEvent[]>
  /** auf der Webseite absagen (reason) bzw. Absage zurücknehmen (cancelled = false) */
  setSiteCancelled(event: DiscordEvent, cancelled: boolean, reason?: string | null): Promise<void>
  /** Ergebnis der Stream-Prüfung speichern (missed = automatisch absagen) */
  markStreamChecked(id: string, missed: boolean): Promise<void>
}

/** Nur echte Discord-IDs archivieren (Demo- oder Testdaten nie) */
const isDiscordId = (id: string) => /^\d{5,25}$/.test(id)

export function createSupabaseDiscordEventArchive(db: SupabaseClient): DiscordEventArchive {
  const table = () => db.from('discord_event_archive')
  // nur die Discord-Felder – eine Absage auf der Webseite bleibt beim Aktualisieren erhalten
  const discordColumns = (event: DiscordEvent) => ({
    id: event.id,
    title: event.title.slice(0, 200),
    description: event.description.slice(0, 2000),
    starts_at: event.startsAt,
    ends_at: event.endsAt,
    status: event.siteCancelled ? 'scheduled' : event.status,
    url: event.url,
    ...(event.location !== undefined ? { location: event.location?.slice(0, 300) ?? null } : {}),
    updated_at: new Date().toISOString(),
  })
  return {
    async save(events) {
      const rows = events.filter(event => isDiscordId(event.id)).map(discordColumns)
      if (!rows.length) return
      let result = await table().upsert(rows)
      // Migration 20261119 noch nicht eingespielt: ohne die neue Spalte „location“ speichern
      if (result.error?.message.includes('location')) result = await table().upsert(rows.map(({ location: _location, ...row }) => row))
      if (result.error) throw fromPostgresError(result.error)
    },
    async list() {
      const result = await table().select('*').order('starts_at', { ascending: false }).limit(500)
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as ArchiveRow[]).map(row => ({
        id: row.id,
        title: row.title,
        description: row.description,
        startsAt: new Date(row.starts_at).toISOString(),
        endsAt: row.ends_at ? new Date(row.ends_at).toISOString() : null,
        status: EventStatusSchema.catch('completed').parse(row.status),
        organizerName: null,
        url: row.url,
        siteCancelled: row.site_cancelled,
        cancelReason: row.site_cancel_reason,
        location: row.location ?? null,
        autoCancelled: row.auto_cancelled ?? false,
        // ohne die neue Spalte (Migration fehlt) nie automatisch absagen
        streamChecked: row.stream_checked ?? true,
      }))
    },
    async setSiteCancelled(event, cancelled, reason = null) {
      if (!isDiscordId(event.id)) return
      const result = await table().upsert({
        ...discordColumns(event),
        site_cancelled: cancelled,
        site_cancel_reason: cancelled ? reason || null : null,
        // zurückgenommen: auch eine automatische Absage aufheben und nicht erneut prüfen
        ...(cancelled ? {} : { auto_cancelled: false, stream_checked: true }),
      })
      if (result.error) throw fromPostgresError(result.error)
    },
    async markStreamChecked(id, missed) {
      const result = await table().update({ stream_checked: true, auto_cancelled: missed }).eq('id', id)
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
