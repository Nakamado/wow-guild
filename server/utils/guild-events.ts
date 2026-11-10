import type { H3Event } from 'h3'
import { checkGuildEventInput } from '#shared/domain/guild-events'
import { GuildEventInputSchema } from '#shared/schemas/guild-events'
import type { GuildEvent } from '#shared/types'

/** Gemeinsamer Auftakt der Schreib-Endpunkte für Gilden-Events (nur live, mit Datenbank) */
export async function beginGuildEventWrite(event: H3Event) {
  assertSameOrigin(event)
  const viewer = await getViewer(event)
  const store = useGuildEventStore()
  if (!store) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: useRuntimeConfig(event).public.demoMode
        ? 'Im Demo-Modus werden Änderungen nur im Browser gespeichert.'
        : 'Speichern ist gerade nicht möglich: Die Datenbank ist nicht eingerichtet.',
    })
  }
  return { viewer, store }
}

/**
 * Event laden, das bearbeitet/abgesagt/gelöscht werden soll – nur eigenes oder als Admin.
 * Abgesagte Events lassen sich nur noch löschen (`allowCancelled`).
 */
export async function loadEditableGuildEvent(
  event: H3Event,
  store: NonNullable<ReturnType<typeof useGuildEventStore>>,
  viewer: Awaited<ReturnType<typeof getViewer>>,
  options: { allowCancelled?: boolean } = {},
): Promise<GuildEvent> {
  const id = getRouterParam(event, 'id') ?? ''
  const existing = /^[0-9a-f-]{36}$/i.test(id) ? await persist(() => store.get(id)) : null
  if (!existing) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Dieses Event gibt es nicht (mehr).' })
  assertPermission(viewer, 'events:edit', { organizerId: existing.createdBy })
  if (existing.status === 'cancelled' && !options.allowCancelled) rejectWith({ code: 'event-cancelled', message: 'Dieses Event wurde bereits abgesagt.' }, 409)
  return existing
}

/** Eingaben lesen und fachlich prüfen */
export async function readGuildEventInput(event: H3Event, previous?: GuildEvent) {
  const input = await readValidatedBody(event, GuildEventInputSchema.parse)
  const check = checkGuildEventInput(input, new Date(), previous)
  if (!check.ok) rejectWith(check.error)
  return check.value
}
