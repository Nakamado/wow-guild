import type { SupabaseClient } from '@supabase/supabase-js'
import { GuildMilestoneSchema, type GuildMilestone } from '#shared/schemas/chronicle'
import { fromPostgresError } from '../errors'

export interface MilestoneStore {
  list(): Promise<GuildMilestone[]>
  /** Neue Meilensteine speichern; bereits bekannte (gleicher dedupeKey) bleiben unverändert */
  add(milestones: readonly GuildMilestone[]): Promise<void>
}

/** Automatisch erkannte Chronik-Meilensteine (Tabelle `guild_milestones`) */
export function createSupabaseMilestoneStore(db: SupabaseClient): MilestoneStore {
  const table = () => db.from('guild_milestones')
  return {
    async list() {
      const result = await table().select('milestone')
      if (result.error) throw fromPostgresError(result.error)
      // Ungültige Zeilen überspringen statt die ganze Chronik scheitern zu lassen
      return (result.data as { milestone: unknown }[])
        .map(row => GuildMilestoneSchema.safeParse(row.milestone))
        .filter(parsed => parsed.success)
        .map(parsed => parsed.data)
    },
    async add(milestones) {
      const rows = milestones.filter(milestone => milestone.dedupeKey).map(milestone => ({ dedupe_key: milestone.dedupeKey!, milestone }))
      if (!rows.length) return
      const result = await table().upsert(rows, { onConflict: 'dedupe_key', ignoreDuplicates: true })
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
