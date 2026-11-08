import { dungeonQuestTitles, type DungeonQuestGroup, type QuestSlot } from '../data/dungeon-quests'
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

/** Dungeon-Gruppe, wie sie die Auswertung braucht */
export type QuestGroup = Pick<DungeonQuestGroup, 'id' | 'name' | 'quests'>

/** Questtitel vergleichbar machen (Groß-/Kleinschreibung, Leerzeichen, Apostrophe) */
export const normalizeQuestTitle = (title: string) => title.toLocaleLowerCase('de-DE').replace(/[’`´]/g, '\'').replace(/\s+/g, ' ').trim()

/** Anzeigename eines Slots (Titel aus der API, sonst aus dem Journal, sonst die ID) */
function slotTitle(slot: QuestSlot, catalog: ReadonlyMap<number, QuestInfo>): string {
  if (typeof slot === 'string') return slot
  const ids = Array.isArray(slot) ? slot : [slot]
  return ids.map(id => catalog.get(id)?.title ?? dungeonQuestTitles[id]).find(Boolean) ?? `Quest ${ids[0]}`
}

/** IDs eines Slots; Titel-Slots werden über die erledigten Quests mit gleichem Titel aufgelöst */
function slotIds(slot: QuestSlot, idsByTitle: ReadonlyMap<string, number[]>): number[] {
  if (typeof slot === 'string') return idsByTitle.get(normalizeQuestTitle(slot)) ?? []
  return Array.isArray(slot) ? slot : [slot]
}

export interface DungeonProgress {
  groupId: string
  name: string
  done: number
  total: number
  complete: boolean
  /** Titel der noch fehlenden Quests */
  missing: string[]
}

export interface QuestProgress {
  dungeonQuests: number[]
  /** Dungeon-Quests (Typ „Dungeon“), die keinem eingetragenen Dungeon zugeordnet sind */
  unassignedDungeonQuests: number[]
  groupQuests: number[]
  dungeons: DungeonProgress[]
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
  groups: readonly QuestGroup[]
}): QuestProgress {
  const done = new Set(input.completed)
  const idsByTitle = new Map<string, number[]>()
  for (const id of done) {
    const title = input.catalog.get(id)?.title
    if (!title) continue
    const key = normalizeQuestTitle(title)
    idsByTitle.set(key, [...(idsByTitle.get(key) ?? []), id])
  }
  const inGroups = new Set(input.groups.flatMap(group => [...group.quests.alliance, ...group.quests.horde].flatMap(slot => slotIds(slot, idsByTitle))))
  const counts = (id: number) => !input.catalog.get(id)?.restricted && input.catalog.get(id)?.typeId !== QUEST_TYPE.class

  const dungeonQuests = onePerTitle([...done].filter(id => counts(id) && (inGroups.has(id) || input.catalog.get(id)?.typeId === QUEST_TYPE.dungeon)), input.catalog)
  const dungeonSet = new Set([...done].filter(id => inGroups.has(id) || input.catalog.get(id)?.typeId === QUEST_TYPE.dungeon))
  const groupQuests = onePerTitle([...done].filter(id => counts(id) && !dungeonSet.has(id) && input.catalog.get(id)?.typeId === QUEST_TYPE.group), input.catalog)

  const dungeons = input.faction
    ? input.groups.map((group) => {
        const required = group.quests[input.faction!]
        const open = required.filter(slot => !slotIds(slot, idsByTitle).some(id => done.has(id)))
        const finished = required.length - open.length
        return {
          groupId: group.id,
          name: group.name,
          done: finished,
          total: required.length,
          complete: required.length > 0 && finished === required.length,
          missing: open.map(slot => slotTitle(slot, input.catalog)),
        }
      }).filter(entry => entry.total > 0)
    : []

  return {
    dungeonQuests: dungeonQuests.sort((a, b) => a - b),
    unassignedDungeonQuests: dungeonQuests.filter(id => !inGroups.has(id)),
    groupQuests: groupQuests.sort((a, b) => a - b), dungeons }
}

/**
 * Gleichnamige Quests nur einmal werten: Manche Quests gibt es unter mehreren IDs (z. B. „Wappen von
 * Lordaeron“ einmal per Gegenstand und einmal beim Questgeber). Es zählt jeweils die kleinste ID.
 */
function onePerTitle(ids: readonly number[], catalog: ReadonlyMap<number, QuestInfo>): number[] {
  const byTitle = new Map<string, number>()
  for (const id of [...ids].sort((a, b) => a - b)) {
    const key = catalog.get(id)?.title.trim().toLocaleLowerCase('de-DE') ?? `#${id}`
    if (!byTitle.has(key)) byTitle.set(key, id)
  }
  return [...byTitle.values()]
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
