import type { H3Event } from 'h3'
import { BoardNoteInputSchema } from '#shared/schemas/board'
import { checkBoardInput } from '#shared/domain/board'

/** Gemeinsamer Auftakt der Schreib-Endpunkte des Schwarzen Bretts (nur Admins, nur live) */
export async function beginBoardWrite(event: H3Event, options: { withBody: boolean }) {
  assertSameOrigin(event)
  const viewer = await requirePermission(event, 'board:manage')
  const store = useBoardStore()
  if (!store) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      message: useRuntimeConfig(event).public.demoMode
        ? 'Im Demo-Modus werden Änderungen nur im Browser gespeichert.'
        : 'Speichern ist gerade nicht möglich: Die Datenbank ist nicht eingerichtet.',
    })
  }
  if (!options.withBody) return { store, viewer, input: null }
  const input = await readValidatedBody(event, BoardNoteInputSchema.parse)
  const check = checkBoardInput(input, new Date())
  if (!check.ok) rejectWith(check.error)
  return { store, viewer, input: check.value }
}
