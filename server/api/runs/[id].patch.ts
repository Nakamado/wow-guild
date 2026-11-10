import { RunInputSchema } from '#shared/schemas/groups'
import { findDungeon } from '#shared/data/dungeons'
import { validateRunDraft } from '#shared/domain/runs'

/** Gruppe bearbeiten – Organisation oder Admin. */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const run = await loadRunForWrite(event)
  assertPermission(viewer, 'runs:edit', { organizerId: run.organizerId })
  if (run.status !== 'open') rejectWith({ code: 'run-not-open', message: 'Abgesagte oder abgeschlossene Gruppen lassen sich nicht mehr bearbeiten.' }, 409)
  const input = await readValidatedBody(event, RunInputSchema.parse)

  const dungeon = findDungeon(input.dungeonSlug)
  if (!dungeon) rejectWith({ code: 'unknown-dungeon', message: 'Bitte wähle einen Dungeon aus.' })
  const draft = validateRunDraft(input, dungeon, new Date(), run)
  if (!draft.ok) rejectWith(draft.error)

  const updated = await persist(() => writers.groups.update(run.id, input))
  await notifyRunChange(run, updated, viewer.memberId)
  return updated
})
