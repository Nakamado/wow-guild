import { leaderboardCharacterIds } from '#shared/domain/admin'
import type { Character } from '#shared/types'
import { characterSlug } from '../providers/blizzard/progress'

/**
 * Charaktere mit Zustimmung zur Rangliste: Selbstfreigabe des Mitglieds (alle seine Charaktere)
 * oder Adminfreigabe mit dokumentierter Zustimmung (nur genau dieser Charakter). Gezählt werden nur
 * Charaktere in der Gilde – ist die Gildenliste gerade nicht abrufbar, zählen vorübergehend alle.
 * null = ohne Datenbank (keine Zustimmungen erfasst).
 */
export async function consentedCharacters(): Promise<{ ids: Set<string>, characters: Character[] } | null> {
  const store = useMemberSettingsStore()
  if (!store) return null
  const [memberIds, grants] = await Promise.all([
    store.listLeaderboardMembers(),
    useGrantStore()?.listActive().catch(() => []) ?? [],
  ])
  if (!memberIds.length && !grants.length) return { ids: new Set(), characters: [] }
  const [characters, roster] = await Promise.all([useProviders().characters.list(), guildRosterBySlug()])
  const ids = leaderboardCharacterIds({
    characters: characters.map(character => ({ id: character.id, memberId: character.memberId, inGuild: !roster || roster.has(characterSlug(character.name)) })),
    optedInMemberIds: new Set(memberIds),
    grants,
  })
  return { ids, characters }
}
