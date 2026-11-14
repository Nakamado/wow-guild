import type { DiscordEvent } from '#shared/types'
import { attachVods, withArchivedEvents } from '#shared/domain/events'

/** Höchstens so oft die gesehenen Events ins Archiv schreiben (je Server-Instanz) */
const ARCHIVE_SYNC_MS = 5 * 60_000
let lastSync = 0

/**
 * Discord-Events für den Kalender: aktuelle Events von Discord plus vergangene aus dem Archiv
 * (Discord entfernt abgeschlossene Events nach kurzer Zeit), jeweils mit Link zum Twitch-VOD,
 * solange Twitch es noch anbietet. Archiv und VODs sind „best effort“ – fallen sie aus,
 * bleibt es bei den aktuellen Discord-Events.
 */
export async function listCalendarDiscordEvents(now = new Date()): Promise<DiscordEvent[]> {
  const providers = useProviders()
  const archive = useRuntimeConfig().public.demoMode ? null : useDiscordEventArchive()
  const [live, vods] = await Promise.all([
    providers.discordEvents.listScheduledEvents(),
    providers.twitch.listVods().catch(() => []),
  ])

  let archived: DiscordEvent[] = []
  if (archive) {
    if (live.length && Date.now() - lastSync > ARCHIVE_SYNC_MS) {
      lastSync = Date.now()
      await archive.save(live).catch(error => console.warn(`[discord-archive] Speichern fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannt'}`))
    }
    archived = await archive.list().catch((error) => {
      console.warn(`[discord-archive] Lesen fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannt'}`)
      return []
    })
  }

  return attachVods(withArchivedEvents(live, archived, now), vods, now)
}

/** Ein Discord-Event aus dem Kalender (aktuell oder archiviert) – 404, wenn es keins gibt */
export async function findDiscordEvent(id: string | undefined): Promise<DiscordEvent> {
  const found = id ? (await listCalendarDiscordEvents()).find(entry => entry.id === id) : undefined
  if (!found) throw createError({ statusCode: 404, statusMessage: 'Dieses Discord-Event gibt es nicht (mehr).' })
  return found
}
