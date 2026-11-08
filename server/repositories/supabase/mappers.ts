import type { Character, GroupRun, Participant, RoleId } from '#shared/types'

/** Zeilenformate der Tabellen (supabase/migrations) */
export interface CharacterRow {
  id: string
  member_id: string
  name: string
  realm: string
  faction: 'alliance' | 'horde'
  class_id: string
  race_id: string
  level: number
  roles: RoleId[]
  is_main: boolean
  updated_at: string
}

export interface ParticipantRow {
  member_id: string
  character_id: string
  role: RoleId
  placement: 'participant' | 'waitlist'
  joined_at: string
}

export interface RunRow {
  id: string
  dungeon_slug: string
  title: string | null
  description: string
  starts_at: string
  organizer_id: string
  status: GroupRun['status']
  capacity_tank: number
  capacity_healer: number
  capacity_dps: number
  waitlist_enabled: boolean
  /** fehlt, solange die Migration 20261111 nicht eingespielt ist */
  quest_ids?: number[] | null
  discord_event_id: string | null
  created_at: string
  updated_at: string
  run_participants?: ParticipantRow[]
}

/** Postgres liefert Mikrosekunden und `+00:00` – einheitlich als ISO-UTC ausgeben */
const iso = (value: string) => new Date(value).toISOString()

export function rowToCharacter(row: CharacterRow): Character {
  return {
    id: row.id,
    memberId: row.member_id,
    name: row.name,
    realm: row.realm,
    faction: row.faction,
    classId: row.class_id,
    raceId: row.race_id,
    level: row.level,
    roles: row.roles,
    isMain: row.is_main,
    source: 'self',
    updatedAt: iso(row.updated_at),
    // Berufe kommen nicht aus der Datenbank, sondern werden aus der Blizzard-API ergänzt
    professions: [],
  }
}

function rowToParticipant(row: ParticipantRow): Participant {
  return { memberId: row.member_id, characterId: row.character_id, role: row.role, joinedAt: iso(row.joined_at) }
}

export function rowToRun(row: RunRow): GroupRun {
  const entries = [...(row.run_participants ?? [])].sort((a, b) => Date.parse(a.joined_at) - Date.parse(b.joined_at))
  return {
    id: row.id,
    dungeonSlug: row.dungeon_slug,
    title: row.title,
    description: row.description,
    startsAt: iso(row.starts_at),
    organizerId: row.organizer_id,
    status: row.status,
    capacity: { tank: row.capacity_tank, healer: row.capacity_healer, dps: row.capacity_dps },
    participants: entries.filter(entry => entry.placement === 'participant').map(rowToParticipant),
    waitlistEnabled: row.waitlist_enabled,
    waitlist: entries.filter(entry => entry.placement === 'waitlist').map(rowToParticipant),
    questIds: row.quest_ids ?? [],
    discordEventId: row.discord_event_id,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
  }
}
