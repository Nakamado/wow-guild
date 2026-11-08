import type { SupabaseClient } from '@supabase/supabase-js'
import type { QuestInfo } from '#shared/domain/quests'
import { fromPostgresError } from '../errors'

interface QuestRow {
  id: number
  title: string
  type_id: number | null
  area_id: number | null
  faction: QuestInfo['faction']
  restricted: boolean
}

export interface QuestCatalogStore {
  get(ids: readonly number[]): Promise<QuestInfo[]>
  save(quests: readonly QuestInfo[]): Promise<void>
}

/** Quest-Katalog in Supabase (Tabelle `quest_catalog`) */
export function createSupabaseQuestCatalog(db: SupabaseClient): QuestCatalogStore {
  return {
    async get(ids) {
      const found: QuestInfo[] = []
      // in Blöcken abfragen (URL-Länge)
      for (let start = 0; start < ids.length; start += 300) {
        const result = await db.from('quest_catalog').select('id, title, type_id, area_id, faction, restricted').in('id', ids.slice(start, start + 300))
        if (result.error) throw fromPostgresError(result.error)
        found.push(...(result.data as QuestRow[]).map(row => ({ id: row.id, title: row.title, typeId: row.type_id, areaId: row.area_id, faction: row.faction, restricted: row.restricted })))
      }
      return found
    },
    async save(quests) {
      if (!quests.length) return
      const result = await db.from('quest_catalog').upsert(quests.map(quest => ({
        id: quest.id,
        title: quest.title,
        type_id: quest.typeId,
        area_id: quest.areaId,
        faction: quest.faction,
        restricted: quest.restricted,
      })))
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
