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
  /** Discord-Rolle „Streamer“ – undefined, wenn die Rollen unbekannt sind (dann unverändert lassen) */
  isStreamer?: boolean
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
    /**
     * Login: Profil anlegen oder aktualisieren. Rollen-Nachprüfung: nur aktualisieren – ein
     * gelöschtes Konto entsteht so nicht durch eine noch offene Sitzung neu.
     * Die Webseitenrolle (is_admin) wird hier nie geschrieben, nur im Adminbereich.
     */
    async save(snapshot) {
      const now = new Date().toISOString()
      const columns = {
        display_name: snapshot.displayName.slice(0, 64),
        avatar_url: snapshot.avatarUrl,
        is_guild_member: snapshot.isGuildMember,
        ...(snapshot.isStreamer !== undefined ? { is_streamer: snapshot.isStreamer } : {}),
        roles_checked_at: now,
      }
      const result = snapshot.login
        ? await table().upsert({ id: snapshot.id, ...columns, last_login_at: now })
        : await table().update(columns).eq('id', snapshot.id)
      if (result.error) throw fromPostgresError(result.error)
    },
  }
}
