import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { CharacterProvider, CharacterWriter, GroupRepository, GroupWriter } from '../../providers/types'
import { fromPostgresError, RepositoryError } from '../errors'
import { rowToCharacter, rowToRun, type CharacterRow, type RunRow } from './mappers'

/**
 * Supabase ausschließlich serverseitig mit dem Service-Role-Key.
 * Autorisierung passiert vorher in Nitro (Identität kommt von Discord).
 */
export function createSupabase(url: string, serviceRoleKey: string): SupabaseClient {
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
}

// `run_participants(*)`: liest auch neue Spalten (z. B. support), ohne vor der Migration zu scheitern
const RUN_SELECT = '*, run_participants(*)'

/** Ergebnis prüfen und bei Fehlern fachlich übersetzen */
function unwrap<T>(result: { data: T | null, error: { code?: string, message?: string } | null }): T {
  if (result.error) throw fromPostgresError(result.error)
  if (result.data === null) throw new RepositoryError('not-found')
  return result.data
}

export function createSupabaseCharacterRepository(db: SupabaseClient): CharacterProvider & CharacterWriter {
  const table = () => db.from('characters')

  return {
    async list() {
      return unwrap(await table().select('*').order('name')).map(row => rowToCharacter(row as unknown as CharacterRow))
    },
    async listByMember(memberId) {
      return unwrap(await table().select('*').eq('member_id', memberId)).map(row => rowToCharacter(row as unknown as CharacterRow))
    },
    async get(id) {
      const result = await table().select('*').eq('id', id).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      return result.data ? rowToCharacter(result.data as unknown as CharacterRow) : null
    },

    async create(memberId, input) {
      const row = unwrap(await table().insert({
        member_id: memberId,
        name: input.name,
        realm: input.realm,
        faction: input.faction,
        class_id: input.classId,
        race_id: input.raceId,
        level: input.level,
        roles: input.roles,
        is_main: input.isMain,
      }).select('*').single())
      return rowToCharacter(row as unknown as CharacterRow)
    },
    async update(id, input) {
      const row = unwrap(await table().update({
        name: input.name,
        faction: input.faction,
        class_id: input.classId,
        race_id: input.raceId,
        level: input.level,
        roles: input.roles,
      }).eq('id', id).select('*').single())
      return rowToCharacter(row as unknown as CharacterRow)
    },
    async remove(id) {
      const result = await table().delete().eq('id', id)
      if (result.error) throw fromPostgresError(result.error)
    },
    async setMain(memberId, id) {
      const result = await db.rpc('set_main_character', { p_member_id: memberId, p_character_id: id })
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}

export function createSupabaseGroupRepository(db: SupabaseClient): GroupRepository & GroupWriter {
  const table = () => db.from('runs')
  const get = async (id: string) => {
    const result = await table().select(RUN_SELECT).eq('id', id).maybeSingle()
    if (result.error) throw fromPostgresError(result.error)
    return result.data ? rowToRun(result.data as unknown as RunRow) : null
  }
  const getOrFail = async (id: string) => {
    const run = await get(id)
    if (!run) throw new RepositoryError('run-not-found')
    return run
  }

  return {
    async list() {
      // Vergangenes bleibt in der DB, die Seite zeigt nur die letzten 30 Tage und alles Kommende
      const since = new Date(Date.now() - 30 * 86_400_000).toISOString()
      return unwrap(await table().select(RUN_SELECT).gte('starts_at', since).order('starts_at'))
        .map(row => rowToRun(row as unknown as RunRow))
    },
    get,

    async create(organizerId, input) {
      const row = unwrap(await table().insert({
        dungeon_slug: input.dungeonSlug,
        title: input.title,
        description: input.description,
        starts_at: input.startsAt,
        organizer_id: organizerId,
        capacity_tank: input.capacity.tank,
        capacity_healer: input.capacity.healer,
        capacity_dps: input.capacity.dps,
        waitlist_enabled: input.waitlistEnabled,
        quest_ids: input.questIds,
      }).select(RUN_SELECT).single())
      return rowToRun(row as unknown as RunRow)
    },
    async update(id, input) {
      const result = await table().update({
        dungeon_slug: input.dungeonSlug,
        title: input.title,
        description: input.description,
        starts_at: input.startsAt,
        capacity_tank: input.capacity.tank,
        capacity_healer: input.capacity.healer,
        capacity_dps: input.capacity.dps,
        waitlist_enabled: input.waitlistEnabled,
        quest_ids: input.questIds,
      }).eq('id', id).eq('status', 'open')
      if (result.error) throw fromPostgresError(result.error)
      return getOrFail(id)
    },
    async cancel(id) {
      const result = await table().update({ status: 'cancelled' }).eq('id', id).eq('status', 'open')
      if (result.error) throw fromPostgresError(result.error)
      return getOrFail(id)
    },
    async join(runId, memberId, characterId, role, support = false, altRole = null) {
      // Zusatzparameter nur mitschicken, wenn gesetzt – so funktionieren einfache Anmeldungen auch vor den Migrationen
      const result = await db.rpc('join_run', {
        p_run_id: runId,
        p_member_id: memberId,
        p_character_id: characterId,
        p_role: role,
        ...(support ? { p_support: true } : {}),
        ...(altRole && altRole !== role ? { p_alt_role: altRole } : {}),
      })
      if (result.error) throw fromPostgresError(result.error)
      return result.data as 'participant' | 'waitlist'
    },
    async leave(runId, memberId) {
      const result = await db.rpc('leave_run', { p_run_id: runId, p_member_id: memberId })
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as string | null) ?? null
    },
  }
}
