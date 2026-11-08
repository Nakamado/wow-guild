import { dungeonQuestGroups, type DungeonQuestGroup } from '#shared/data/dungeon-quests'
import { questProgress, type QuestInfo, type QuestProgress } from '#shared/domain/quests'
import { characterSlug } from '../providers/blizzard/progress'
import { fetchCompletedQuests, fetchQuestInfo, type CompletedQuests } from '../providers/blizzard/quests'

/**
 * Quests aus der Blizzard-API für Punkte und Dungeon-Fortschritt.
 * - abgeschlossene Quests je Charakter: 30 Minuten zwischengespeichert
 * - Questdaten (Titel, Art, Fraktion): einmal nachschlagen, dauerhaft in Supabase (`quest_catalog`)
 * - welche Quests zu welchem Dungeon gehören: shared/data/dungeon-quests.ts (aus dem Dungeon Journal)
 */

/** höchstens so viele unbekannte Quests pro Aufruf nachschlagen – der Rest folgt beim nächsten Mal */
const MAX_LOOKUPS = 250
const LOOKUP_CONCURRENCY = 8

const memoryCatalog = new Map<number, QuestInfo>()
/** Quests, die Blizzard (noch) nicht kennt – nicht bei jedem Aufruf erneut nachschlagen */
const notFound = new Map<number, number>()
const NOT_FOUND_RETRY_MS = 60 * 60 * 1000

const cachedCompleted = defineCachedFunction(async (name: string): Promise<CompletedQuests> => {
  const blizzard = blizzardClient()
  if (!blizzard) throw new Error('Blizzard-API nicht eingerichtet')
  const app = await blizzard.client.getAppToken()
  if (!app.token) throw new Error('Kein Blizzard-App-Token')
  const result = await fetchCompletedQuests(blizzard.client, app.token, blizzard.region, name)
  if (!result) throw new Error('Unerwartete Antwort von quests/completed')
  return result
}, { name: 'quests-completed', maxAge: 30 * 60, swr: true, getKey: (name: string) => characterSlug(name) })

/** Questdaten für diese IDs: Speicher → Datenbank → Blizzard (neu Gefundenes wird gespeichert) */
export async function catalogFor(ids: readonly number[], namespace: string): Promise<Map<number, QuestInfo>> {
  const wanted = [...new Set(ids)]
  let missing = wanted.filter(id => !memoryCatalog.has(id))
  const store = useQuestCatalogStore()
  if (missing.length && store) {
    for (const quest of await store.get(missing).catch(() => [])) memoryCatalog.set(quest.id, quest)
    missing = missing.filter(id => !memoryCatalog.has(id))
  }
  missing = missing.filter(id => (notFound.get(id) ?? 0) < Date.now())
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
      for (const id of batch) if (!memoryCatalog.has(id)) notFound.set(id, Date.now() + NOT_FOUND_RETRY_MS)
      if (store && found.length) await store.save(found).catch(error => console.warn('[quests] Katalog nicht gespeichert:', error instanceof Error ? error.message : 'unbekannt'))
      if (missing.length > MAX_LOOKUPS) console.info(`[quests] ${missing.length - MAX_LOOKUPS} Quests werden beim nächsten Aufruf nachgeschlagen`)
    }
  }
  return new Map(wanted.filter(id => memoryCatalog.has(id)).map(id => [id, memoryCatalog.get(id)!]))
}

/** alle Quest-IDs der Dungeon-Liste */
export const dungeonQuestIds = (groups: readonly DungeonQuestGroup[] = dungeonQuestGroups) =>
  [...new Set(groups.flatMap(group => [...group.quests.alliance, ...group.quests.horde].flat()).filter((slot): slot is number => typeof slot === 'number'))]

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
  const catalog = await catalogFor(completed.flatMap(entry => entry.quests?.ids ?? []), namespace)
  const groupCatalog = await catalogFor(dungeonQuestIds(), namespace)
  const titles = new Map([...groupCatalog, ...catalog].map(([id, quest]) => [id, quest.title]))

  for (const { character, quests } of completed) {
    if (!quests) continue
    results.set(characterSlug(character.name), {
      progress: questProgress({ completed: quests.ids, faction: character.faction, catalog: new Map([...groupCatalog, ...catalog]), groups: dungeonQuestGroups }),
      titles,
    })
  }
  return { results, groupNames }
}
