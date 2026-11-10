import { RunInputSchema } from '#shared/schemas/groups'
import { findDungeon } from '#shared/data/dungeons'
import { validateRunDraft } from '#shared/domain/runs'

/** Neue Dungeon- oder Raidgruppe planen. */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  assertPermission(viewer, 'runs:create')
  const input = await readValidatedBody(event, RunInputSchema.parse)

  const dungeon = findDungeon(input.dungeonSlug)
  if (!dungeon) rejectWith({ code: 'unknown-dungeon', message: 'Bitte wähle einen Dungeon aus.' })
  const draft = validateRunDraft(input, dungeon, new Date())
  if (!draft.ok) rejectWith(draft.error)

  const created = await persist(() => writers.groups.create(viewer.memberId, input))
  if (input.announce !== false) await announceRunCreated(created)
  setResponseStatus(event, 201)
  return created
})
