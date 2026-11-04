import { CharacterInputSchema, MAX_CHARACTERS_PER_MEMBER } from '#shared/schemas/community'
import { checkCharacterInput } from '#shared/domain/characters'

/** Eigenen Charakter anlegen. Der erste Charakter wird automatisch Hauptcharakter. */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  assertPermission(viewer, 'characters:manage', { ownerId: viewer.memberId })
  const input = await readValidatedBody(event, CharacterInputSchema.parse)

  const existing = await useProviders().characters.listByMember(viewer.memberId)
  const check = checkCharacterInput(input, existing, { maxCharacters: MAX_CHARACTERS_PER_MEMBER })
  if (!check.ok) rejectWith(check.error)

  const realm = useRuntimeConfig(event).public.guild.realm
  setResponseStatus(event, 201)
  return persist(() => writers.characters.create(viewer.memberId, { ...check.value, realm, isMain: existing.length === 0 }))
})
