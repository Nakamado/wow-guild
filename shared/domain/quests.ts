import type { DungeonQuestGroup } from '../data/dungeon-quests'
import type { ProgressEvent } from '../schemas/points'

/** Quest-Arten laut Blizzard-API (`type.id`) */
export const QUEST_TYPE = { group: 1, class: 21, raid: 62, dungeon: 81 } as const

export interface QuestInfo {
  id: number
  title: string
  typeId: number | null
  areaId: number | null
  /** nur für diese Fraktion annehmbar; null = beide */
  faction: 'alliance' | 'horde' | null
  /** Klassen- oder Volksbeschränkung (zählt nie) */
  restricted: boolean
}

/** Dungeon-Gruppe mit aufgelösten Quests (klassisch: aus der Gebiets-Liste der API) */
export interface ResolvedDungeonGroup {
  id: string
  name: string
  questIds: { alliance: number[], horde: number[] }
}

export interface DungeonProgress {
  groupId: string
  name: string
  done: number
  total: number
  complete: boolean
}

export interface QuestProgress {
  dungeonQuests: number[]
  groupQuests: number[]
  dungeons: DungeonProgress[]
}

/**
 * Quests einer Gebiets-Liste für beide Fraktionen aufteilen (ohne Klassen-/Volksquests).
 * Unbekannte Quests (noch nicht nachgeschlagen) zählen vorerst für beide Fraktionen.
 */
export function resolveDungeonGroup(group: DungeonQuestGroup, areaQuestIds: readonly number[], catalog: ReadonlyMap<number, QuestInfo>): ResolvedDungeonGroup {
  if (group.quests) return { id: group.id, name: group.name, questIds: group.quests }
  const usable = areaQuestIds.filter(id => !catalog.get(id)?.restricted)
  return {
    id: group.id,
    name: group.name,
    questIds: {
      alliance: usable.filter(id => catalog.get(id)?.faction !== 'horde'),
      horde: usable.filter(id => catalog.get(id)?.faction !== 'alliance'),
    },
  }
}

/**
 * Was zählt aus den abgeschlossenen Quests eines Charakters?
 * - Dungeon-Quest: steht in einer Dungeon-Gruppe oder hat den Typ „Dungeon“
 * - Gruppenquest: Typ „Gruppe“, sofern keine Dungeon-Quest
 * - Klassen- und Volksquests zählen nie
 * - Dungeon vollständig: alle Dungeon-Quests der eigenen Fraktion einer Gruppe erledigt
 */
export function questProgress(input: {
  completed: readonly number[]
  faction: 'alliance' | 'horde' | null
  catalog: ReadonlyMap<number, QuestInfo>
  groups: readonly ResolvedDungeonGroup[]
}): QuestProgress {
  const done = new Set(input.completed)
  const inGroups = new Set(input.groups.flatMap(group => [...group.questIds.alliance, ...group.questIds.horde]))
  const counts = (id: number) => !input.catalog.get(id)?.restricted && input.catalog.get(id)?.typeId !== QUEST_TYPE.class

  const dungeonQuests = [...done].filter(id => counts(id) && (inGroups.has(id) || input.catalog.get(id)?.typeId === QUEST_TYPE.dungeon))
  const dungeonSet = new Set(dungeonQuests)
  const groupQuests = [...done].filter(id => counts(id) && !dungeonSet.has(id) && input.catalog.get(id)?.typeId === QUEST_TYPE.group)

  const dungeons = input.faction
    ? input.groups.map((group) => {
        const required = group.questIds[input.faction!]
        const finished = required.filter(id => done.has(id)).length
        return { groupId: group.id, name: group.name, done: finished, total: required.length, complete: required.length > 0 && finished === required.length }
      }).filter(entry => entry.total > 0)
    : []

  return { dungeonQuests: dungeonQuests.sort((a, b) => a - b), groupQuests: groupQuests.sort((a, b) => a - b), dungeons }
}

/** Punkte-Ereignisse aus dem Quest-Fortschritt (rückwirkend, einmalig je Charakter) */
export function questEvents(character: { memberId: string, characterId: string }, progress: QuestProgress): ProgressEvent[] {
  const base = { memberId: character.memberId, characterId: character.characterId, occurredAt: null }
  return [
    ...progress.dungeonQuests.map(id => ({ ...base, type: 'dungeon-quest' as const, objectId: `quest:${id}` })),
    ...progress.groupQuests.map(id => ({ ...base, type: 'group-quest' as const, objectId: `quest:${id}` })),
    ...progress.dungeons.filter(entry => entry.complete).map(entry => ({ ...base, type: 'dungeon-first' as const, objectId: `group:${entry.groupId}` })),
  ]
}
