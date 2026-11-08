import { dungeonQuestGroups } from '#shared/data/dungeon-quests'
import { questProgress, resolveDungeonGroup, type QuestInfo, type QuestProgress, type ResolvedDungeonGroup } from '#shared/domain/quests'
import { characterSlug } from '../providers/blizzard/progress'
import { fetchCompletedQuests, fetchQuestArea, fetchQuestInfo, type CompletedQuests } from '../providers/blizzard/quests'

/**
 * Quests aus der Blizzard-API für Punkte und Dungeon-Fortschritt.
 * - abgeschlossene Quests je Charakter: 30 Minuten zwischengespeichert
 * - Questdaten (Art, Gebiet, Fraktion): einmal nachschlagen, dauerhaft in Supabase (`quest_catalog`)
 * - Quest-Listen der Dungeon-Gebiete: 24 Stunden zwischengespeichert
 */

/** höchstens so viele unbekannte Quests pro Aufruf nachschlagen – der Rest folgt beim nächsten Mal */
const MAX_LOOKUPS = 250
const LOOKUP_CONCURRENCY = 8

const memoryCatalog = new Map<number, QuestInfo>()

const cachedCompleted = defineCachedFunction(async (name: string): Promise<CompletedQuests> => {
  const blizzard = blizzardClient()
  if (!blizzard) throw new Error('Blizzard-API nicht eingerichtet')
  const app = await blizzard.client.getAppToken()
  if (!app.token) throw new Error('Kein Blizzard-App-Token')
  const result = await fetchCompletedQuests(blizzard.client, app.token, blizzard.region, name)
  if (!result) throw new Error('Unerwartete Antwort von quests/completed')
  return result
}, { name: 'quests-completed', maxAge: 30 * 60, swr: true, getKey: (name: string) => characterSlug(name) })

const cachedArea = defineCachedFunction(async (areaId: number, namespace: string) => {
  const blizzard = blizzardClient()
  if (!blizzard) throw new Error('Blizzard-API nicht eingerichtet')
  const app = await blizzard.client.getAppToken()
  if (!app.token) throw new Error('Kein Blizzard-App-Token')
  return fetchQuestArea(blizzard.client, app.token, namespace, areaId)
}, { name: 'quest-area', maxAge: 24 * 60 * 60, swr: true, getKey: (areaId: number, namespace: string) => `${namespace}:${areaId}` })

/** Questdaten für diese IDs: Speicher → Datenbank → Blizzard (neu Gefundenes wird gespeichert) */
async function catalogFor(ids: readonly number[], namespace: string): Promise<Map<number, QuestInfo>> {
  const wanted = [...new Set(ids)]
  let missing = wanted.filter(id => !memoryCatalog.has(id))
  const store = useQuestCatalogStore()
  if (missing.length && store) {
    for (const quest of await store.get(missing).catch(() => [])) memoryCatalog.set(quest.id, quest)
    missing = missing.filter(id => !memoryCatalog.has(id))
  }
  const blizzard = blizzardClient()
  if (missing.length && blizzard) {
    const app = await blizzard.client.getAppToken()
    if (app.token) {
      const batch = missing.slice(0, MAX_LOOKUPS)
      const found: QuestInfo[] = []
      for (let start = 0; start < batch.length; start += LOOKUP_CONCURRENCY) {
        const results = await Promise.all(batch.slice(start, start + LOOKUP_CONCURRENCY).map(id => fetchQuestInfo(blizzard.client, app.token!, namespace, id).catch(() => null)))
        found.push(...results.filter((quest): quest is QuestInfo => quest !== null))
      }
      for (const quest of found) memoryCatalog.set(quest.id, quest)
      if (store && found.length) await store.save(found).catch(error => console.warn('[quests] Katalog nicht gespeichert:', error instanceof Error ? error.message : 'unbekannt'))
      if (missing.length > MAX_LOOKUPS) console.info(`[quests] ${missing.length - MAX_LOOKUPS} Quests werden beim nächsten Aufruf nachgeschlagen`)
    }
  }
  return new Map(wanted.filter(id => memoryCatalog.has(id)).map(id => [id, memoryCatalog.get(id)!]))
}

/** Dungeon-Gruppen mit aufgelösten Quest-Listen (klassisch aus der API, Forever von Hand) */
export async function resolvedDungeonGroups(namespace: string): Promise<{ groups: ResolvedDungeonGroup[], areas: Map<string, { name: string | null, questIds: number[] } | null> }> {
  const areas = new Map<string, { name: string | null, questIds: number[] } | null>()
  await Promise.all(dungeonQuestGroups.filter(group => group.areaId).map(async (group) => {
    areas.set(group.id, await cachedArea(group.areaId!, namespace).catch(() => null))
  }))
  const allIds = [...[...areas.values()].flatMap(area => area?.questIds ?? []), ...dungeonQuestGroups.flatMap(group => group.extraQuestIds ?? [])]
  const catalog = await catalogFor(allIds, namespace)
  const groups = dungeonQuestGroups.map(group => resolveDungeonGroup(group, areas.get(group.id)?.questIds ?? [], catalog))
  return { groups, areas }
}

export interface CharacterQuestResult {
  progress: QuestProgress
  /** Questtitel für die Aufschlüsselung */
  titles: Map<number, string>
}

/**
 * Quest-Fortschritt mehrerer Charaktere (Schlüssel = Charakter-Slug). Charaktere, deren Quests
 * gerade nicht abrufbar sind, fehlen im Ergebnis – sie bekommen dann einfach keine Questpunkte.
 */
export async function questProgressFor(characters: readonly { name: string, faction: 'alliance' | 'horde' | null }[]): Promise<{ results: Map<string, CharacterQuestResult>, groupNames: Map<string, string> }> {
  const results = new Map<string, CharacterQuestResult>()
  const groupNames = new Map(dungeonQuestGroups.map(group => [group.id, group.name]))
  const blizzard = blizzardClient()
  if (!blizzard || !characters.length) return { results, groupNames }

  const completed = await Promise.all(characters.map(async character => ({ character, quests: await cachedCompleted(character.name).catch(() => null) })))
  const namespace = completed.find(entry => entry.quests?.staticNamespace)?.quests?.staticNamespace ?? `static-forever-${blizzard.region}`
  const { groups } = await resolvedDungeonGroups(namespace)
  const catalog = await catalogFor(completed.flatMap(entry => entry.quests?.ids ?? []), namespace)
  const groupCatalog = await catalogFor(groups.flatMap(group => [...group.questIds.alliance, ...group.questIds.horde].flat()).filter((slot): slot is number => typeof slot === 'number'), namespace)
  const titles = new Map([...groupCatalog, ...catalog].map(([id, quest]) => [id, quest.title]))

  for (const { character, quests } of completed) {
    if (!quests) continue
    results.set(characterSlug(character.name), {
      progress: questProgress({ completed: quests.ids, faction: character.faction, catalog: new Map([...groupCatalog, ...catalog]), groups }),
      titles,
    })
  }
  return { results, groupNames }
}
