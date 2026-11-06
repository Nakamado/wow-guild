import type { SupabaseClient } from '@supabase/supabase-js'
import type { BoardNote, BoardNoteInput } from '#shared/types'
import { fromPostgresError } from '../errors'

interface BoardNoteRow {
  id: string
  title: string
  body: string | null
  expires_on: string | null
  created_by: string
  created_at: string
  updated_at: string
}

const iso = (value: string) => new Date(value).toISOString()

function rowToNote(row: BoardNoteRow): BoardNote {
  return {
    id: row.id,
    title: row.title,
    text: row.body,
    expiresOn: row.expires_on,
    createdBy: row.created_by,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    isDemo: false,
  }
}

export interface BoardStore {
  list(): Promise<BoardNote[]>
  create(createdBy: string, input: BoardNoteInput): Promise<BoardNote>
  update(id: string, input: BoardNoteInput): Promise<BoardNote>
  remove(id: string): Promise<void>
}

/** Aushänge des Schwarzen Bretts in Supabase (Tabelle `board_notes`) */
export function createSupabaseBoardStore(db: SupabaseClient): BoardStore {
  const table = () => db.from('board_notes')
  const columns = (input: BoardNoteInput) => ({ title: input.title, body: input.text, expires_on: input.expiresOn })
  return {
    async list() {
      const result = await table().select('*').order('created_at', { ascending: false }).limit(100)
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as BoardNoteRow[]).map(rowToNote)
    },
    async create(createdBy, input) {
      const result = await table().insert({ ...columns(input), created_by: createdBy }).select('*').single()
      if (result.error) throw fromPostgresError(result.error)
      return rowToNote(result.data as BoardNoteRow)
    },
    async update(id, input) {
      const result = await table().update(columns(input)).eq('id', id).select('*').single()
      if (result.error) throw fromPostgresError(result.error)
      return rowToNote(result.data as BoardNoteRow)
    },
    async remove(id) {
      const result = await table().delete().eq('id', id)
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
