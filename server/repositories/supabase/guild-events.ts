import type { SupabaseClient } from '@supabase/supabase-js'
import type { GuildEvent, GuildEventInput } from '#shared/types'
import { fromPostgresError } from '../errors'

interface GuildEventRow {
  id: string
  title: string
  description: string
  starts_at: string
  ends_at: string | null
  location: string | null
  status: GuildEvent['status']
  created_by: string
  created_at: string
  updated_at: string
}

const iso = (value: string) => new Date(value).toISOString()

function rowToEvent(row: GuildEventRow): GuildEvent {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startsAt: iso(row.starts_at),
    endsAt: row.ends_at ? iso(row.ends_at) : null,
    location: row.location,
    status: row.status,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}

export interface GuildEventStore {
  list(): Promise<GuildEvent[]>
  get(id: string): Promise<GuildEvent | null>
  create(createdBy: string, input: GuildEventInput): Promise<GuildEvent>
  update(id: string, input: GuildEventInput): Promise<GuildEvent>
  cancel(id: string): Promise<GuildEvent>
}

/** Gilden-Events in Supabase (Tabelle `guild_events`) */
export function createSupabaseGuildEventStore(db: SupabaseClient): GuildEventStore {
  const table = () => db.from('guild_events')
  const columns = (input: GuildEventInput) => ({
    title: input.title,
    description: input.description,
    starts_at: input.startsAt,
    ends_at: input.endsAt,
    location: input.location,
  })
  return {
    async list() {
      // ein halbes Jahr zurück reicht für den Kalender
      const since = new Date(Date.now() - 183 * 86_400_000).toISOString()
      const result = await table().select('*').gte('starts_at', since).order('starts_at').limit(200)
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as GuildEventRow[]).map(rowToEvent)
    },
    async get(id) {
      const result = await table().select('*').eq('id', id).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      return result.data ? rowToEvent(result.data as GuildEventRow) : null
    },
    async create(createdBy, input) {
      const result = await table().insert({ ...columns(input), created_by: createdBy }).select('*').single()
      if (result.error) throw fromPostgresError(result.error)
      return rowToEvent(result.data as GuildEventRow)
    },
    async update(id, input) {
      const result = await table().update(columns(input)).eq('id', id).eq('status', 'scheduled').select('*').single()
      if (result.error) throw fromPostgresError(result.error)
      return rowToEvent(result.data as GuildEventRow)
    },
    async cancel(id) {
      const result = await table().update({ status: 'cancelled' }).eq('id', id).select('*').single()
      if (result.error) throw fromPostgresError(result.error)
      return rowToEvent(result.data as GuildEventRow)
    },
  }
}
