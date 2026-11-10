import { JoinInputSchema } from '#shared/schemas/groups'
import { findDungeon } from '#shared/data/dungeons'
import { canJoinRun } from '#shared/domain/runs'

/**
 * Anmelden. Fachregeln (Klasse/Rolle, Mindeststufe, Gildenrolle) prüft die gemeinsame
 * Domain-Logik; Plätze und Doppelanmeldungen prüft `join_run()` atomar in Postgres.
 */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  assertPermission(viewer, 'runs:join')
  const run = await loadRunForWrite(event)
  const { characterId, role, support } = await readValidatedBody(event, JoinInputSchema.parse)

  const dungeon = findDungeon(run.dungeonSlug)
  // Stufe/Klasse live aus der Blizzard-API, damit die Mindeststufe am aktuellen Stand gemessen wird
  const stored = await useProviders().characters.get(characterId)
  const character = stored ? (await withGameData([stored]))[0] ?? stored : null
  if (!dungeon) rejectWith({ code: 'unknown-dungeon', message: 'Dieser Dungeon ist unbekannt.' })
  if (!character || character.memberId !== viewer.memberId) {
    rejectWith({ code: 'character-not-owned', message: 'Bitte wähle einen deiner Charaktere aus.' }, 403)
  }

  const check = canJoinRun({ run, dungeon, member: { id: viewer.memberId, isGuildMember: true }, character, role, support, now: new Date() })
  if (!check.ok) rejectWith(check.error, 409)

  const placement = await persist(() => writers.groups.join(run.id, viewer.memberId, character.id, role, support))
  const updated = await useProviders().groups.get(run.id)
  return { placement, warnings: check.value.warnings, run: updated && redactRun(updated, viewer) }
})
