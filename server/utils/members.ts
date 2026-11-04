import type { Character, CommunityMember } from '#shared/types'

export interface MemberWithCharacters extends CommunityMember {
  characters: Character[]
}

/** Hauptcharakter zuerst, danach nach Stufe absteigend. */
export function sortCharacters(characters: Character[]): Character[] {
  return [...characters].sort((a, b) => Number(b.isMain) - Number(a.isMain) || b.level - a.level || a.name.localeCompare(b.name, 'de'))
}

export async function loadMembersWithCharacters(): Promise<MemberWithCharacters[]> {
  const providers = useProviders()
  const [members, characters] = await Promise.all([providers.members.listGuildMembers(), providers.characters.list()])
  return members
    .map(member => ({ ...member, characters: sortCharacters(characters.filter(character => character.memberId === member.id)) }))
    .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
}
