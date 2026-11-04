/** Hauptcharakter festlegen (genau einer je Mitglied). */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const character = await loadOwnCharacter(event, viewer.memberId)
  assertPermission(viewer, 'characters:manage', { ownerId: character.memberId })
  await persist(() => writers.characters.setMain(viewer.memberId, character.id))
  return sortCharacters(await useProviders().characters.listByMember(viewer.memberId))
})
