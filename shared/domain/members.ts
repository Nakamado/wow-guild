import type { Character, CommunityMember, RoleId } from '../types'

export interface MemberFilter {
  /** Freitext: Discord-Anzeigename oder Charaktername */
  query?: string
  classId?: string | null
  role?: RoleId | null
  minLevel?: number | null
  maxLevel?: number | null
}

type MemberWithCharacters = CommunityMember & { characters: Character[] }

const normalize = (value: string) =>
  value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/\p{Diacritic}/gu, '')

/**
 * Filtert Mitglieder anhand ihrer Charaktere. Ein Mitglied passt, wenn mindestens
 * EIN Charakter alle Charakter-Kriterien (Klasse, Rolle, Stufe) gleichzeitig erfüllt.
 * Mitglieder ohne Charakter erscheinen nur, solange kein Charakter-Kriterium aktiv ist.
 */
export function filterMembers<T extends MemberWithCharacters>(members: readonly T[], filter: MemberFilter): T[] {
  const query = filter.query?.trim() ? normalize(filter.query.trim()) : null
  const hasCharacterCriteria = Boolean(filter.classId || filter.role || filter.minLevel != null || filter.maxLevel != null)

  const characterMatches = (character: Character) =>
    (!filter.classId || character.classId === filter.classId)
    && (!filter.role || character.roles.includes(filter.role))
    && (filter.minLevel == null || character.level >= filter.minLevel)
    && (filter.maxLevel == null || character.level <= filter.maxLevel)

  return members.filter((member) => {
    if (query) {
      const names = [member.displayName, ...member.characters.map(character => character.name)]
      if (!names.some(name => normalize(name).includes(query))) return false
    }
    if (!hasCharacterCriteria) return true
    return member.characters.some(characterMatches)
  })
}
