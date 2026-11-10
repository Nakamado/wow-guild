import type { CalendarEvent, GuildEvent, GuildEventInput } from '../types'
import { fail, ok, type DomainResult } from './result'

export type GuildEventErrorCode = 'starts-in-past' | 'ends-before-start' | 'too-long'

/** Höchstdauer eines Events (über Nacht ist ok, mehrtägige Events nicht) */
const MAX_DURATION_MS = 24 * 3_600_000

/**
 * Fachliche Prüfung vor dem Speichern (gleiche Regel in Demo und live).
 * Beim Bearbeiten darf der Beginn in der Vergangenheit bleiben, wenn er nicht geändert wird.
 */
export function checkGuildEventInput(
  input: GuildEventInput,
  now: Date,
  previous?: Pick<GuildEvent, 'startsAt'>,
): DomainResult<GuildEventInput, GuildEventErrorCode> {
  const start = Date.parse(input.startsAt)
  const unchangedStart = previous && Date.parse(previous.startsAt) === start
  if (!unchangedStart && start <= now.getTime()) {
    return fail('starts-in-past', 'Der Beginn muss in der Zukunft liegen.')
  }
  if (input.endsAt) {
    const end = Date.parse(input.endsAt)
    if (end <= start) return fail('ends-before-start', 'Das Ende muss nach dem Beginn liegen.')
    if (end - start > MAX_DURATION_MS) return fail('too-long', 'Ein Event darf höchstens 24 Stunden dauern.')
  }
  return ok(input)
}

export function guildEventToCalendar(event: GuildEvent, organizerName: string | null = null): CalendarEvent {
  return {
    id: `guild:${event.id}`,
    source: 'guild',
    type: 'community',
    title: event.title,
    description: event.description,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    status: event.status === 'cancelled'
      ? 'cancelled'
      : Date.parse(event.endsAt ?? event.startsAt) < Date.now() ? 'completed' : 'scheduled',
    organizerName,
    url: null,
    runId: null,
    openSlots: null,
    guildEventId: event.id,
    location: event.location,
  }
}
