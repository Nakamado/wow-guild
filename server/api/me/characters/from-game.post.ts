import { MAX_CHARACTERS_PER_MEMBER, QuickCharacterInputSchema } from '#shared/schemas/community'
import { characterFromGame, checkCharacterInput } from '#shared/domain/characters'

/**
 * Charakter nur mit Name und Rollen anlegen – Stufe, Klasse, Volk und Fraktion kommen von Blizzard.
 * - nicht gefunden → 422 `character-not-in-game`
 * - Blizzard nicht erreichbar → 503 `game-data-unavailable` (die Seite zeigt dann das volle Formular)
 * - unvollständige Daten → 422 `game-data-incomplete` mit den bekannten Angaben zum Vorausfüllen
 */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  assertPermission(viewer, 'characters:manage', { ownerId: viewer.memberId })
  const input = await readValidatedBody(event, QuickCharacterInputSchema.parse)

  const lookup = await lookupGameCharacter(event, input.name)
  if (lookup.status === 'not-found') rejectWith(notInGameError(input.name))
  if (lookup.status === 'unavailable') {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message: 'Blizzard ist gerade nicht erreichbar – bitte trag die Angaben selbst ein.',
      data: { code: 'game-data-unavailable' },
    })
  }

  const config = useRuntimeConfig(event)
  const defaultFaction = config.public.guild.faction === 'horde' ? 'horde' : 'alliance'
  const built = characterFromGame(input, lookup.profile, defaultFaction)
  if (!built.ok) {
    const { profile } = lookup
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: built.error.message,
      data: { code: built.error.code, prefill: { level: profile.level, classId: profile.classId, raceId: profile.raceId, faction: profile.faction } },
    })
  }

  const existing = await useProviders().characters.listByMember(viewer.memberId)
  const check = checkCharacterInput(built.value, existing, { maxCharacters: MAX_CHARACTERS_PER_MEMBER })
  if (!check.ok) rejectWith(check.error)

  setResponseStatus(event, 201)
  const realm = config.public.guild.realm
  const created = await persist(() => writers.characters.create(viewer.memberId, { ...check.value, realm, isMain: existing.length === 0 }))
  const [enriched] = await withGameData([created])
  return enriched ?? created
})
