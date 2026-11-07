import { isUpcoming } from '#shared/domain/runs'

/**
 * Eigenen Charakter löschen. Mit offenen Anmeldungen nicht möglich (sonst rückt niemand
 * von der Warteliste nach). War es der Hauptcharakter, übernimmt der höchststufige Twink.
 */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const character = await loadOwnCharacter(event, viewer.memberId)
  assertPermission(viewer, 'characters:manage', { ownerId: character.memberId })

  const now = new Date()
  const runs = await useProviders().groups.list()
  const signedUp = runs.some(run => isUpcoming(run, now)
    && [...run.participants, ...run.waitlist].some(entry => entry.characterId === character.id))
  if (signedUp) rejectWith({ code: 'has-signups', message: `${character.name} ist noch für kommende Runs angemeldet. Melde ihn zuerst ab.` }, 409)

  await persist(() => writers.characters.remove(character.id))
  await logActivity({ action: 'character.removed', actorId: viewer.memberId, subjectType: 'character', subjectId: character.id, summary: `${character.name} entfernt` })

  if (character.isMain) {
    const [next] = sortCharacters(await useProviders().characters.listByMember(viewer.memberId))
    if (next) await persist(() => writers.characters.setMain(viewer.memberId, next.id))
  }
  setResponseStatus(event, 204)
  return null
})
