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
  // Auf der Webseite abgesagt (von Hand oder automatisch): gilt auch, wenn Discord es noch als geplant führt
  const overrides = new Map(archived
    .filter(event => event.siteCancelled || event.autoCancelled)
    .map(event => [event.id, { reason: event.autoCancelled ? AUTO_CANCEL_REASON : event.cancelReason ?? null, auto: Boolean(event.autoCancelled) }]))
  return [...live, ...past].map((event) => {
    const override = overrides.get(event.id)
    return override
      ? { ...event, status: 'cancelled' as const, siteCancelled: true, autoCancelled: override.auto, cancelReason: override.reason }
      : event
  })
}

export const AUTO_CANCEL_REASON = 'Kein Stream auf Twitch gefunden'
/** So lange nach dem Beginn muss Miinyu live sein (oder gewesen sein), sonst gilt der Stream als ausgefallen */
export const STREAM_CHECK_DELAY_MS = 60 * 60_000
/** Ältere Events werden nicht mehr automatisch abgesagt (Twitch hebt VODs mindestens 7 Tage auf) */
export const STREAM_CHECK_MAX_AGE_MS = 6 * 86_400_000

/** Sieht nach einem Stream aus: Twitch-Link als Ort oder „Stream“ im Titel */
export function isStreamEvent(event: Pick<DiscordEvent, 'title' | 'location'>): boolean {
  return /twitch\.tv/i.test(event.location ?? '') || /stream/i.test(event.title)
}

const eventEnd = (event: Pick<DiscordEvent, 'startsAt' | 'endsAt'>) =>
  event.endsAt ? Date.parse(event.endsAt) : Date.parse(event.startsAt) + DEFAULT_EVENT_HOURS * 3_600_000

/**
 * Prüfung „hat der Stream stattgefunden?“ – ab 1 Std. nach Beginn des Stream-Events:
 * - 'pending': noch zu früh (oder kein Stream-Event / schon abgesagt) – nichts tun
 * - 'too-old': zu alt für eine sichere Aussage – als geprüft markieren, nicht absagen
 * - 'streamed': Miinyu ist gerade live (während des Events) oder es gibt eine Übertragung,
 *   die zwischen 1 Std. vor und 1 Std. nach Beginn lief (Twitch legt das VOD schon beim Start an)
 * - 'missed': nichts davon → automatisch absagen
 */
export function streamCheck(event: DiscordEvent, vods: Vod[], now = new Date(), liveNow = false): 'pending' | 'too-old' | 'streamed' | 'missed' {
  if (!isStreamEvent(event) || event.status === 'cancelled' || event.siteCancelled) return 'pending'
  const start = Date.parse(event.startsAt)
  const end = eventEnd(event)
  const time = now.getTime()
  if (time < start + STREAM_CHECK_DELAY_MS) return 'pending'
  if (time > end + STREAM_CHECK_MAX_AGE_MS) return 'too-old'
  if (liveNow && time <= end) return 'streamed'
  const aroundStart = vods.some((vod) => {
    const vodStart = Date.parse(vod.startedAt)
    return vodStart <= start + STREAM_CHECK_DELAY_MS && vodStart + vod.durationSeconds * 1000 >= start - VOD_EARLY_START_MS
  })
  return aroundStart ? 'streamed' : 'missed'
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
  return events.map((event) => {
    if (event.status === 'cancelled' || Date.parse(event.startsAt) > now.getTime()) return event
    const vod = findVod(event, vods)
    return vod ? { ...event, vodUrl: vod.url } : event
  })
}

/** VOD mit der größten zeitlichen Überschneidung (Stream darf bis zu 1 Std. früher starten) */
export function findVod(event: Pick<DiscordEvent, 'startsAt' | 'endsAt'>, vods: Vod[]): Vod | null {
  const start = Date.parse(event.startsAt)
  const end = eventEnd(event)
  let best: { vod: Vod, overlap: number } | null = null
  for (const vod of vods) {
    const vodStart = Date.parse(vod.startedAt)
    const overlap = Math.min(end, vodStart + vod.durationSeconds * 1000) - Math.max(start - VOD_EARLY_START_MS, vodStart)
    if (overlap > 0 && (!best || overlap > best.overlap)) best = { vod, overlap }
  }
  return best?.vod ?? null
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
