import type { SupabaseClient } from '@supabase/supabase-js'
import type { CommunityMember } from '#shared/types'
import type { DiscordMemberProvider } from '../../providers/types'
import { fromPostgresError } from '../errors'

export interface MemberRow {
  id: string
  display_name: string
  avatar_url: string | null
  is_guild_member: boolean
  is_admin: boolean
}

export function rowToMember(row: MemberRow): CommunityMember {
  return {
    id: row.id,
    discordId: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    profileUrl: `https://discord.com/users/${row.id}`,
    preferredRoles: [],
    isGuildMember: row.is_guild_member,
    isAdmin: row.is_admin,
    source: 'discord',
  }
}

export interface MemberSnapshot {
  id: string
  displayName: string
  avatarUrl: string | null
  isGuildMember: boolean
  isAdmin: boolean
  /** true beim Login, false bei der Rollen-Nachprüfung */
  login: boolean
}

/** Mitglieder aus Supabase: alle, die sich angemeldet haben und (zuletzt geprüft) die Gildenrolle tragen. */
export function createSupabaseMemberRepository(db: SupabaseClient): DiscordMemberProvider & { save(snapshot: MemberSnapshot): Promise<void> } {
  const table = () => db.from('members')
  return {
    async listGuildMembers() {
      const result = await table().select('id, display_name, avatar_url, is_guild_member, is_admin').eq('is_guild_member', true).order('display_name')
      if (result.error) throw fromPostgresError(result.error)
      return (result.data as MemberRow[]).map(rowToMember)
    },
    async getMember(id) {
      const result = await table().select('id, display_name, avatar_url, is_guild_member, is_admin').eq('id', id).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      return result.data ? rowToMember(result.data as MemberRow) : null
    },
    async save(snapshot) {
      const now = new Date().toISOString()
      const result = await table().upsert({
        id: snapshot.id,
        display_name: snapshot.displayName.slice(0, 64),
        avatar_url: snapshot.avatarUrl,
        is_guild_member: snapshot.isGuildMember,
        is_admin: snapshot.isAdmin,
        roles_checked_at: now,
        ...(snapshot.login ? { last_login_at: now } : {}),
      })
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
