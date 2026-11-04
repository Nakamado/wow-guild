import type { z } from 'zod'
import type * as S from '../schemas'

/**
 * Gemeinsame Typen – direkt aus den Zod-Schemas abgeleitet, damit Laufzeitvalidierung
 * und TypeScript nie auseinanderlaufen. Nuxt importiert sie in app/ und server/ automatisch.
 */
export type Faction = z.infer<typeof S.FactionSchema>
export type RoleId = z.infer<typeof S.RoleIdSchema>
export type DataSource = z.infer<typeof S.DataSourceSchema>
export type SourceRef = z.infer<typeof S.SourceRefSchema>

export type GameClass = z.infer<typeof S.GameClassSchema>
export type Race = z.infer<typeof S.RaceSchema>
export type LevelRange = z.infer<typeof S.LevelRangeSchema>
export type Dungeon = z.infer<typeof S.DungeonSchema>

export type CommunityMember = z.infer<typeof S.CommunityMemberSchema>
export type Character = z.infer<typeof S.CharacterSchema>

export type RoleCapacity = z.infer<typeof S.RoleCapacitySchema>
export type Participant = z.infer<typeof S.ParticipantSchema>
export type RunStatus = z.infer<typeof S.RunStatusSchema>
export type GroupRun = z.infer<typeof S.GroupRunSchema>

export type EventStatus = z.infer<typeof S.EventStatusSchema>
export type DiscordEvent = z.infer<typeof S.DiscordEventSchema>
export type CalendarEvent = z.infer<typeof S.CalendarEventSchema>

export type StreamStatus = z.infer<typeof S.StreamStatusSchema>
export type Clip = z.infer<typeof S.ClipSchema>
export type ClipPeriod = z.infer<typeof S.ClipPeriodSchema>
export type ClipSort = z.infer<typeof S.ClipSortSchema>
export type Streamer = z.infer<typeof S.StreamerSchema>

export type GuildInfo = z.infer<typeof S.GuildInfoSchema>
export type GuildStats = z.infer<typeof S.GuildStatsSchema>
