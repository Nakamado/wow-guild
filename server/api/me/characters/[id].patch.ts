import { CharacterInputSchema, MAX_CHARACTERS_PER_MEMBER } from '#shared/schemas/community'
import { checkCharacterInput } from '#shared/domain/characters'

/** Eigenen Charakter bearbeiten (z. B. Level aktualisieren, umbenennen). */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const character = await loadOwnCharacter(event, viewer.memberId)
  assertPermission(viewer, 'characters:manage', { ownerId: character.memberId })
  const input = await readValidatedBody(event, CharacterInputSchema.parse)

  const existing = await useProviders().characters.listByMember(viewer.memberId)
  const check = checkCharacterInput(input, existing, { editingId: character.id, maxCharacters: MAX_CHARACTERS_PER_MEMBER })
  if (!check.ok) rejectWith(check.error)
  if (check.value.name !== character.name) await assertCharacterExistsInGame(event, check.value.name)

  return persist(() => writers.characters.update(character.id, check.value))
})
