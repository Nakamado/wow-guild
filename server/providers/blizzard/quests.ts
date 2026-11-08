import type { QuestInfo } from '#shared/domain/quests'
import type { BlizzardClient } from './client'
import { characterSlug } from './progress'
import { findStaticNamespace } from './probe'

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const num = (value: unknown) => (typeof value === 'number' && Number.isInteger(value) ? value : null)

export interface CompletedQuests {
  ids: number[]
  /** versionierter Static-Namespace aus den Links (z. B. static-1.60.1_70399-forever-eu) */
  staticNamespace: string | null
}

/** `/profile/wow/character/{slug}/quests/completed` → Quest-IDs */
export function parseCompletedQuests(body: unknown): CompletedQuests | null {
  if (!isObject(body) || !Array.isArray(body.quests)) return null
  const ids = body.quests.map(quest => (isObject(quest) ? num(quest.id) : null)).filter((id): id is number => id !== null && id > 0)
  return { ids: [...new Set(ids)], staticNamespace: findStaticNamespace(body) }
}

/** `/data/wow/quest/{id}` → Art, Gebiet, Fraktion, Klassen-/Volksbeschränkung */
export function parseQuestInfo(body: unknown): QuestInfo | null {
  if (!isObject(body)) return null
  const id = num(body.id)
  if (id === null) return null
  const requirements = isObject(body.requirements) ? body.requirements : {}
  const factionType = isObject(requirements.faction) ? requirements.faction.type : null
  const hasEntries = (value: unknown) => (Array.isArray(value) ? value.length > 0 : isObject(value))
  return {
    id,
    title: typeof body.title === 'string' && body.title.trim() ? body.title.trim().slice(0, 120) : `Quest ${id}`,
    typeId: isObject(body.type) ? num(body.type.id) : null,
    areaId: isObject(body.area) ? num(body.area.id) : null,
    faction: factionType === 'ALLIANCE' ? 'alliance' : factionType === 'HORDE' ? 'horde' : null,
    restricted: hasEntries(requirements.classes) || hasEntries(requirements.races) || hasEntries(requirements.character_classes) || hasEntries(requirements.playable_classes) || hasEntries(requirements.playable_races),
  }
}

/** `/data/wow/quest/area/{id}` → Gebietsname und Quest-IDs */
export function parseQuestArea(body: unknown): { name: string | null, questIds: number[] } | null {
  if (!isObject(body) || !Array.isArray(body.quests)) return null
  return {
    name: typeof body.area === 'string' ? body.area : null,
    questIds: body.quests.map(quest => (isObject(quest) ? num(quest.id) : null)).filter((id): id is number => id !== null),
  }
}

export async function fetchCompletedQuests(client: BlizzardClient, token: string, region: string, name: string): Promise<CompletedQuests | null> {
  const response = await client.get(`/profile/wow/character/${encodeURIComponent(characterSlug(name))}/quests/completed`, `profile-forever-${region}`, token)
  if (response.status === 404) return { ids: [], staticNamespace: null } // noch keine Quests
  if (response.status !== 200) throw new Error(`quests/completed HTTP ${response.status}`)
  return parseCompletedQuests(response.body)
}

export async function fetchQuestInfo(client: BlizzardClient, token: string, namespace: string, id: number): Promise<QuestInfo | null> {
  const response = await client.get(`/data/wow/quest/${id}`, namespace, token)
  if (response.status === 404) return null
  if (response.status !== 200) throw new Error(`quest ${id} HTTP ${response.status}`)
  return parseQuestInfo(response.body)
}

export async function fetchQuestArea(client: BlizzardClient, token: string, namespace: string, areaId: number) {
  const response = await client.get(`/data/wow/quest/area/${areaId}`, namespace, token)
  if (response.status === 404) return null
  if (response.status !== 200) throw new Error(`quest area ${areaId} HTTP ${response.status}`)
  return parseQuestArea(response.body)
}
