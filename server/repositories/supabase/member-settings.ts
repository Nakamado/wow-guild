import type { SupabaseClient } from '@supabase/supabase-js'
import type { MemberSettings } from '#shared/schemas/member-settings'
import { fromPostgresError, RepositoryError } from '../errors'

interface SettingsRow {
  id: string
  leaderboard_opt_in: boolean
  is_streamer: boolean
  twitch_login: string | null
}

export interface StreamerMember {
  memberId: string
  twitchLogin: string
}

export interface MemberSettingsStore {
  get(memberId: string): Promise<MemberSettings | null>
  update(memberId: string, patch: Partial<MemberSettings>): Promise<MemberSettings>
  /** Gildenmitglieder, die der Rangliste zugestimmt haben */
  listLeaderboardMembers(): Promise<string[]>
  /** Gildenmitglieder mit Streamer-Rolle und eingetragenem Twitch-Kanal */
  listStreamers(): Promise<StreamerMember[]>
}

const SELECT = 'id, leaderboard_opt_in, is_streamer, twitch_login'
const toSettings = (row: SettingsRow): MemberSettings => ({ leaderboardOptIn: row.leaderboard_opt_in, twitchLogin: row.twitch_login })

export function createSupabaseMemberSettingsStore(db: SupabaseClient): MemberSettingsStore {
  const table = () => db.from('members')
  return {
    async get(memberId) {
      const result = await table().select(SELECT).eq('id', memberId).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      return result.data ? toSettings(result.data as SettingsRow) : null
    },
    async update(memberId, patch) {
      const columns = {
        ...(patch.leaderboardOptIn !== undefined ? { leaderboard_opt_in: patch.leaderboardOptIn } : {}),
        ...(patch.twitchLogin !== undefined ? { twitch_login: patch.twitchLogin } : {}),
      }
      const result = await table().update(columns).eq('id', memberId).select(SELECT).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      if (!result.data) throw new RepositoryError('not-found')
      return toSettings(result.data as SettingsRow)
    },
    async listLeaderboardMembers() {
      const result = await table().select('id').eq('is_guild_member', true).eq('leaderboard_opt_in', true)
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as { id: string }[]).map(row => row.id)
    },
    async listStreamers() {
      const result = await table().select(SELECT).eq('is_guild_member', true).eq('is_streamer', true).not('twitch_login', 'is', null)
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as SettingsRow[]).map(row => ({ memberId: row.id, twitchLogin: row.twitch_login! }))
    },
  }
}
