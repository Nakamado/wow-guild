import type { CalendarEvent, DiscordEvent, Dungeon, EventStatus, GroupRun } from '../types'
import { computeComposition } from './composition'

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
  }
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
  }
}

export interface MergeInput {
  discordEvents: readonly DiscordEvent[]
  runs: readonly GroupRun[]
  dungeons: readonly Pick<Dungeon, 'slug' | 'name' | 'kind'>[]
  organizerNames?: ReadonlyMap<string, string>
}

/**
 * Führt Discord-Events und Webseiten-Runs zu einem Kalender zusammen.
 * - Discord ist führend für Discord-Events, die Webseite für Runs.
 * - Wurde ein Run per Bot als Discord-Event angekündigt (`discordEventId`),
 *   erscheint nur der Run – das Discord-Duplikat wird ausgeblendet.
 * - Sortiert nach Startzeit; doppelte IDs werden entfernt.
 */
export function mergeEvents({ discordEvents, runs, dungeons, organizerNames }: MergeInput): CalendarEvent[] {
  const announcedIds = new Set(runs.map(run => run.discordEventId).filter((id): id is string => id !== null))
  const dungeonBySlug = new Map(dungeons.map(dungeon => [dungeon.slug, dungeon]))

  const events = [
    ...discordEvents.filter(event => !announcedIds.has(event.id)).map(discordEventToCalendar),
    ...runs.map(run => runToCalendar(run, dungeonBySlug.get(run.dungeonSlug), organizerNames?.get(run.organizerId) ?? null)),
  ]

  const unique = new Map<string, CalendarEvent>()
  for (const event of events) if (!unique.has(event.id)) unique.set(event.id, event)

  return [...unique.values()].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id),
  )
}
