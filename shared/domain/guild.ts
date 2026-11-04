import { MAX_LEVEL } from '../schemas/common'
import type { Character, CommunityMember, GroupRun, GuildStats } from '../types'
import { isUpcoming } from './runs'

/** Gildenstatistiken – nur aus Gildenmitgliedern und deren Charakteren berechnet. */
export function computeGuildStats(
  members: readonly CommunityMember[],
  characters: readonly Character[],
  runs: readonly GroupRun[],
  now: Date,
): GuildStats {
  const guildMemberIds = new Set(members.filter(member => member.isGuildMember).map(member => member.id))
  const guildCharacters = characters.filter(character => guildMemberIds.has(character.memberId))

  const classDistribution: Record<string, number> = {}
  for (const character of guildCharacters) {
    classDistribution[character.classId] = (classDistribution[character.classId] ?? 0) + 1
  }

  const levelSum = guildCharacters.reduce((sum, character) => sum + character.level, 0)

  return {
    memberCount: guildMemberIds.size,
    characterCount: guildCharacters.length,
    classDistribution,
    averageLevel: guildCharacters.length ? Math.round((levelSum / guildCharacters.length) * 10) / 10 : 0,
    maxLevelCount: guildCharacters.filter(character => character.level === MAX_LEVEL).length,
    upcomingRunCount: runs.filter(run => isUpcoming(run, now)).length,
  }
}
