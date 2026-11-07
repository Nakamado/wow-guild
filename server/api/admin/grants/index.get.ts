/**
 * Ranglistenfreigaben (nur Hauptadmin): alle Freigaben und die Mitglieder mit ihren Charakteren
 * für das Formular. Ohne Nachweis-URLs – Screenshots gibt es nur über den geschützten Endpunkt.
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'leaderboard:grant')
  const grants = requireStore(useGrantStore())
  const accounts = requireStore(useAccountStore())
  const settings = requireStore(useMemberSettingsStore())
  const [all, members, characters, optedIn] = await Promise.all([
    persist(() => grants.listAll()),
    persist(() => accounts.listForAdmin()),
    useProviders().characters.list(),
    persist(() => settings.listLeaderboardMembers()),
  ])
  const optedInIds = new Set(optedIn)
  const characterById = new Map(characters.map(character => [character.id, character]))
  return {
    grants: all.map(grant => ({ ...grant, characterName: characterById.get(grant.characterId)?.name ?? 'Gelöschter Charakter' })),
    members: members.map(member => ({
      id: member.id,
      displayName: member.displayName,
      optedIn: optedInIds.has(member.id),
      characters: characters.filter(character => character.memberId === member.id).map(character => ({ id: character.id, name: character.name })),
    })).filter(member => member.characters.length),
  }
})
