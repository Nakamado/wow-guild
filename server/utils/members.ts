import type { Character, CommunityMember } from '#shared/types'
import { sortCharacters } from '#shared/domain/characters'

export interface MemberWithCharacters extends CommunityMember {
  characters: Character[]
}

/** Hauptcharakter zuerst, danach nach Stufe absteigend (gemeinsame Regel mit dem Client). */
export { sortCharacters } from '#shared/domain/characters'

export async function loadMembersWithCharacters(): Promise<MemberWithCharacters[]> {
  const providers = useProviders()
  const [members, rawCharacters] = await Promise.all([providers.members.listGuildMembers(), providers.characters.list()])
  const memberIds = new Set(members.map(member => member.id))
  // Berufe nur für Charaktere von Gildenmitgliedern abrufen
  const characters = await withGameProfessions(rawCharacters.filter(character => memberIds.has(character.memberId)))
  return members
    .map(member => ({ ...member, characters: sortCharacters(characters.filter(character => character.memberId === member.id)) }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
}
