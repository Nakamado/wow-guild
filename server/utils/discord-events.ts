import type { DiscordEvent, Vod } from '#shared/types'
import { attachVods, streamCheck, withArchivedEvents } from '#shared/domain/events'
import type { ArchivedDiscordEvent } from '../repositories/supabase/discord-event-archive'

/** Höchstens so oft die gesehenen Events ins Archiv schreiben (je Server-Instanz) */
const ARCHIVE_SYNC_MS = 5 * 60_000
let lastSync = 0

const warn = (label: string) => (error: unknown) => {
  console.warn(`[discord-archive] ${label}: ${error instanceof Error ? error.message : 'unbekannt'}`)
}

/**
 * Discord-Events für den Kalender: aktuelle Events von Discord plus vergangene aus dem Archiv
 * (Discord entfernt beendete Events nach kurzer Zeit), jeweils mit Link zum Twitch-VOD,
 * solange Twitch es noch anbietet. Ausgefallene Streams werden automatisch abgesagt.
 * Archiv und VODs sind „best effort“ – fallen sie aus, bleibt es bei den aktuellen Discord-Events.
 */
export async function listCalendarDiscordEvents(now = new Date(), options: { forceSync?: boolean } = {}): Promise<DiscordEvent[]> {
  const providers = useProviders()
  const archive = useRuntimeConfig().public.demoMode ? null : useDiscordEventArchive()
  const [live, vods] = await Promise.all([
    providers.discordEvents.listScheduledEvents(),
    providers.twitch.listVods().catch(() => [] as Vod[]),
  ])

  let archived: ArchivedDiscordEvent[] = []
  if (archive) {
    const sync = options.forceSync || Date.now() - lastSync > ARCHIVE_SYNC_MS
    if (sync) {
      lastSync = Date.now()
      if (live.length) await archive.save(live).catch(warn('Speichern fehlgeschlagen'))
    }
    archived = await archive.list().catch((error) => {
      warn('Lesen fehlgeschlagen')(error)
      return []
    })
    if (sync) {
      const liveNow = await providers.twitch.getStreamStatus().then(status => status.isLive).catch(() => false)
      archived = await checkMissedStreams(archived, vods, now, liveNow)
    }
  }

  return attachVods(withArchivedEvents(live, archived, now), vods, now)
}

/**
 * Stream-Events einmalig prüfen, ab 1 Std. nach Beginn: nicht live und keine Übertragung um den
 * Beginn herum → automatisch abgesagt. Ohne VOD-Liste und ohne Livestream (Twitch nicht erreichbar
 * oder Kanal ohne gespeicherte Übertragungen) wird nichts entschieden, damit ein Ausfall von
 * Twitch keine Streams fälschlich absagt.
 */
async function checkMissedStreams(archived: ArchivedDiscordEvent[], vods: Vod[], now: Date, liveNow: boolean): Promise<ArchivedDiscordEvent[]> {
  const archive = useDiscordEventArchive()
  if (!archive || (!vods.length && !liveNow)) return archived
  return Promise.all(archived.map(async (event) => {
    if (event.streamChecked) return event
    const result = streamCheck(event, vods, now, liveNow)
    if (result === 'pending') return event
    const missed = result === 'missed'
    try {
      await archive.markStreamChecked(event.id, missed)
      if (missed) console.info(`[discord-archive] Kein Stream gefunden, automatisch abgesagt: ${event.title} (${event.startsAt})`)
      return { ...event, streamChecked: true, autoCancelled: missed }
    }
    catch (error) {
      warn('Stream-Prüfung nicht gespeichert')(error)
      return event
    }
  }))
}

/** Für die tägliche Bereinigung: Archiv auffrischen und Streams prüfen, auch ohne Seitenaufruf */
export async function syncDiscordEventArchive(): Promise<number> {
  return (await listCalendarDiscordEvents(new Date(), { forceSync: true })).length
}

/** Ein Discord-Event aus dem Kalender (aktuell oder archiviert) – 404, wenn es keins gibt */
export async function findDiscordEvent(id: string | undefined): Promise<DiscordEvent> {
  const found = id ? (await listCalendarDiscordEvents()).find(entry => entry.id === id) : undefined
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Dieses Discord-Event gibt es nicht (mehr).' })
  return found
}
