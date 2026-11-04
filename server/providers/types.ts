import type {
  Character,
  Clip,
  ClipPeriod,
  ClipSort,
  CommunityMember,
  DiscordEvent,
  Dungeon,
  GroupRun,
  GuildInfo,
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

/**
 * Lesender Zugriff auf Runs. Schreibende Methoden (erstellen, beitreten, verlassen)
 * folgen mit dem Gruppenplaner (Phase 4) – im Live-Betrieb atomar per `join_run()`.
 */
export interface GroupRepository {
  list(): Promise<GroupRun[]>
  get(id: string): Promise<GroupRun | null>
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
