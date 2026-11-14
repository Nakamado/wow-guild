import type { CalendarEvent, DiscordEvent, Dungeon, EventStatus, GroupRun, GuildEvent, Vod } from '../types'
import { computeComposition } from './composition'
import { guildEventToCalendar } from './guild-events'

const runStatusToEvent: Record<GroupRun['status'], EventStatus> = {
  open: 'scheduled',
  cancelled: 'cancelled',
  completed: 'completed',
}

export function discordEventToCalendar(event: DiscordEvent): CalendarEvent {
  return {
    id: `discord:${event.id}`,
    source: 'discord',
    type: 'community',
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status,
    organizerName: event.organizerName,
    url: event.url,
    runId: null,
    openSlots: null,
    guildEventId: null,
    location: null,
    cancelReason: event.status === 'cancelled' ? event.cancelReason ?? null : null,
    vodUrl: event.vodUrl ?? null,
    siteCancelled: event.siteCancelled ?? false,
  }
}

/**
 * Aktuelle Discord-Events plus vergangene aus dem Archiv, die Discord nicht mehr liefert.
 * Ein Event, das vor seinem Beginn verschwunden ist, wurde gelöscht – das bleibt weg.
 * Archivierte gelten als abgeschlossen (außer abgesagte); den Discord-Link gibt es dann nicht mehr.
 */
export function withArchivedEvents(live: DiscordEvent[], archived: DiscordEvent[], now = new Date()): DiscordEvent[] {
  const liveIds = new Set(live.map(event => event.id))
  const past = archived
    .filter(event => !liveIds.has(event.id) && Date.parse(event.startsAt) <= now.getTime())
    .map(event => ({ ...event, url: null, status: event.status === 'cancelled' ? event.status : 'completed' as const }))
  // Auf der Webseite abgesagt: gilt auch für Events, die Discord noch als geplant führt
  const siteCancelled = new Map(archived.filter(event => event.siteCancelled).map(event => [event.id, event.cancelReason ?? null]))
  return [...live, ...past].map(event => (siteCancelled.has(event.id)
    ? { ...event, status: 'cancelled' as const, siteCancelled: true, cancelReason: siteCancelled.get(event.id) ?? null }
    : event))
}

/** Längste Annahme für Events ohne Ende (Stunden) */
const DEFAULT_EVENT_HOURS = 3
/** Ein Stream darf so viel früher starten als das Event und trotzdem dazugehören */
const VOD_EARLY_START_MS = 60 * 60_000

/**
 * Ordnet vergangenen Discord-Events das passende VOD zu: das mit der größten zeitlichen
 * Überschneidung (Stream darf bis zu 1 Std. vor dem Event starten). Abgesagte bekommen keins.
 */
export function attachVods<T extends DiscordEvent>(events: T[], vods: Vod[], now = new Date()): T[] {
  if (!vods.length) return events
  const spans = vods.map(vod => ({ vod, start: Date.parse(vod.startedAt), end: Date.parse(vod.startedAt) + vod.durationSeconds * 1000 }))
  return events.map((event) => {
    const start = Date.parse(event.startsAt)
    if (event.status === 'cancelled' || start > now.getTime()) return event
    const end = event.endsAt ? Date.parse(event.endsAt) : start + DEFAULT_EVENT_HOURS * 3_600_000
    let best: { url: string, overlap: number } | null = null
    for (const span of spans) {
      const overlap = Math.min(end, span.end) - Math.max(start - VOD_EARLY_START_MS, span.start)
      if (overlap > 0 && (!best || overlap > best.overlap)) best = { url: span.vod.url, overlap }
    }
    return best ? { ...event, vodUrl: best.url } : event
  })
}

export function runToCalendar(
  run: GroupRun,
  dungeon: Pick<Dungeon, 'name' | 'kind'> | undefined,
  organizerName: string | null = null,
): CalendarEvent {
  return {
    id: `site:${run.id}`,
    source: 'site',
    type: dungeon?.kind === 'raid' ? 'raid' : 'dungeon',
    title: run.title ?? dungeon?.name ?? 'Gruppe',
    description: run.description,
    startsAt: run.startsAt,
    endsAt: null,
    status: runStatusToEvent[run.status],
    organizerName,
    url: null,
    runId: run.id,
    openSlots: computeComposition(run).open,
    guildEventId: null,
    location: null,
    cancelReason: run.status === 'cancelled' ? run.cancelReason ?? null : null,
    vodUrl: null,
    siteCancelled: false,
  }
}

export interface MergeInput {
  discordEvents: readonly DiscordEvent[]
  runs: readonly GroupRun[]
  dungeons: readonly Pick<Dungeon, 'slug' | 'name' | 'kind'>[]
  /** auf der Webseite eingetragene Gilden-Events */
  guildEvents?: readonly GuildEvent[]
  organizerNames?: ReadonlyMap<string, string>
}

/**
 * Führt Discord-Events, Webseiten-Runs und Gilden-Events zu einem Kalender zusammen.
 * - Discord ist führend für Discord-Events, die Webseite für Runs.
 * - Wurde ein Run per Bot als Discord-Event angekündigt (`discordEventId`),
 *   erscheint nur der Run – das Discord-Duplikat wird ausgeblendet.
 * - Sortiert nach Startzeit; doppelte IDs werden entfernt.
 */
export function mergeEvents({ discordEvents, runs, dungeons, guildEvents = [], organizerNames }: MergeInput): CalendarEvent[] {
  const announcedIds = new Set(runs.map(run => run.discordEventId).filter((id): id is string => id !== null))
  const dungeonBySlug = new Map(dungeons.map(dungeon => [dungeon.slug, dungeon]))

  const events = [
    ...discordEvents.filter(event => !announcedIds.has(event.id)).map(discordEventToCalendar),
    ...runs.map(run => runToCalendar(run, dungeonBySlug.get(run.dungeonSlug), organizerNames?.get(run.organizerId) ?? null)),
    ...guildEvents.map(event => guildEventToCalendar(event, organizerNames?.get(event.createdBy) ?? null)),
  ]

  const unique = new Map<string, CalendarEvent>()
  for (const event of events) if (!unique.has(event.id)) unique.set(event.id, event)

  return [...unique.values()].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id),
  )
}
