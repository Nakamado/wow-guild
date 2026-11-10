import type {
  Character,
  CharacterInput,
  Clip,
  ClipPeriod,
  ClipSort,
  CommunityMember,
  DiscordEvent,
  Dungeon,
  GroupRun,
  GuildInfo,
  RoleId,
  Streamer,
  StreamStatus,
} from '#shared/types'

/**
 * Austauschbare Datenquellen. Jede Implementierung (Demo, Discord, Twitch, Supabase …)
 * liefert bereits validierte, normalisierte Domain-Typen – nie rohe API-Antworten.
 */

export interface DungeonCatalogProvider {
  list(): Promise<Dungeon[]>
  get(slug: string): Promise<Dungeon | null>
}

export interface GuildProvider {
  getInfo(): Promise<GuildInfo>
}

export interface DiscordMemberProvider {
  /** Nur Träger der Gildenrolle */
  listGuildMembers(): Promise<CommunityMember[]>
  getMember(id: string): Promise<CommunityMember | null>
}

export interface CharacterProvider {
  list(): Promise<Character[]>
  listByMember(memberId: string): Promise<Character[]>
  get(id: string): Promise<Character | null>
}

export interface DiscordEventProvider {
  listScheduledEvents(): Promise<DiscordEvent[]>
}

export interface ClipQuery {
  period: ClipPeriod
  sort: ClipSort
  limit: number
}

export interface TwitchProvider {
  getStreamStatus(): Promise<StreamStatus>
  listClips(query: ClipQuery): Promise<Clip[]>
  listStreamers(): Promise<Streamer[]>
}

/** Lesender Zugriff auf Runs (Demo: fester Datensatz, Live: Supabase). */
export interface GroupRepository {
  list(): Promise<GroupRun[]>
  get(id: string): Promise<GroupRun | null>
}

export type NewCharacter = CharacterInput & { realm: string, isMain: boolean }

/**
 * Schreibzugriffe (nur live). Berechtigungen und Fachregeln prüft der Aufrufer vorher;
 * Fehler kommen als `RepositoryError` mit Code (z. B. `role-full`).
 */
export interface CharacterWriter {
  create(memberId: string, input: NewCharacter): Promise<Character>
  update(id: string, input: CharacterInput): Promise<Character>
  remove(id: string): Promise<void>
  setMain(memberId: string, id: string): Promise<void>
}

export type RunWrite = Pick<GroupRun, 'dungeonSlug' | 'title' | 'description' | 'startsAt' | 'capacity' | 'waitlistEnabled'> & { questIds: number[] }

export interface GroupWriter {
  create(organizerId: string, input: RunWrite): Promise<GroupRun>
  update(id: string, input: RunWrite): Promise<GroupRun>
  cancel(id: string): Promise<GroupRun>
  /** Atomar (Postgres `join_run()`): Platz oder Warteliste */
  /** `support`: als Supporter (macht Platz für feste Anmeldungen) */
  join(runId: string, memberId: string, characterId: string, role: RoleId, support?: boolean): Promise<'participant' | 'waitlist'>
  /** Atomar (`leave_run()`): gibt die Mitglieds-ID der nachgerückten Person zurück */
  leave(runId: string, memberId: string): Promise<string | null>
}

export interface Writers {
  characters: CharacterWriter
  groups: GroupWriter
}

export interface Providers {
  dungeons: DungeonCatalogProvider
  guild: GuildProvider
  members: DiscordMemberProvider
  characters: CharacterProvider
  discordEvents: DiscordEventProvider
  twitch: TwitchProvider
  groups: GroupRepository
}

export type ProviderKey = keyof Providers
