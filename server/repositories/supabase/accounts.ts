import type { SupabaseClient } from '@supabase/supabase-js'
import { fromPostgresError } from '../errors'

export interface SiteAccount {
  isAdmin: boolean
  privacyNoticeVersion: number
}

export interface AdminMemberRow {
  id: string
  displayName: string
  avatarUrl: string | null
  isAdmin: boolean
  isGuildMember: boolean
  characterCount: number
  registeredAt: string
  lastLoginAt: string
}

export interface AccountStore {
  /** null = kein Konto (nie angemeldet oder gelöscht) */
  get(memberId: string): Promise<SiteAccount | null>
  setAdmin(memberId: string, isAdmin: boolean): Promise<boolean>
  confirmPrivacyNotice(memberId: string, version: number): Promise<void>
  listForAdmin(): Promise<AdminMemberRow[]>
  counts(since: Date): Promise<{ members: number, characters: number, newMembers: number, newCharacters: number }>
  /**
   * Konto und alles Zugehörige löschen: Charaktere (mit Anmeldungen und Freigaben), eigene Aushänge,
   * selbst organisierte Gruppen, Profil. Kommende Anmeldungen vorher über die Runs abmelden (Nachrücker).
   */
  deleteAccount(memberId: string): Promise<void>
}

const iso = (value: string) => new Date(value).toISOString()

/** Konten in Supabase (Tabelle `members` und abhängige Tabellen) */
export function createSupabaseAccountStore(db: SupabaseClient): AccountStore {
  return {
    async get(memberId) {
      const result = await db.from('members').select('is_admin, privacy_notice_version').eq('id', memberId).maybeSingle()
      if (result.error) throw fromPostgresError(result.error)
      if (!result.data) return null
      const row = result.data as { is_admin: boolean, privacy_notice_version: number }
      return { isAdmin: row.is_admin, privacyNoticeVersion: row.privacy_notice_version }
    },

    async setAdmin(memberId, isAdmin) {
      const result = await db.from('members').update({ is_admin: isAdmin }).eq('id', memberId).select('id')
      if (result.error) throw fromPostgresError(result.error)
      return (result.data ?? []).length > 0
    },

    async confirmPrivacyNotice(memberId, version) {
      const result = await db.from('members').update({ privacy_notice_version: version }).eq('id', memberId).lt('privacy_notice_version', version)
      if (result.error) throw fromPostgresError(result.error)
    },

    async listForAdmin() {
      const [members, characters] = await Promise.all([
        db.from('members').select('id, display_name, avatar_url, is_admin, is_guild_member, created_at, last_login_at').order('display_name'),
        db.from('characters').select('member_id'),
      ])
      if (members.error) throw fromPostgresError(members.error)
      if (characters.error) throw fromPostgresError(characters.error)
      const counts = new Map<string, number>()
      for (const row of characters.data as { member_id: string }[]) counts.set(row.member_id, (counts.get(row.member_id) ?? 0) + 1)
      return (members.data as { id: string, display_name: string, avatar_url: string | null, is_admin: boolean, is_guild_member: boolean, created_at: string, last_login_at: string }[])
        .map(row => ({
          id: row.id,
          displayName: row.display_name,
          avatarUrl: row.avatar_url,
          isAdmin: row.is_admin,
          isGuildMember: row.is_guild_member,
          characterCount: counts.get(row.id) ?? 0,
          registeredAt: iso(row.created_at),
          lastLoginAt: iso(row.last_login_at),
        }))
    },

    async counts(since) {
      const head = { count: 'exact' as const, head: true }
      const after = since.toISOString()
      const [members, characters, newMembers, newCharacters] = await Promise.all([
        db.from('members').select('id', head),
        db.from('characters').select('id', head),
        db.from('members').select('id', head).gte('created_at', after),
        db.from('characters').select('id', head).gte('created_at', after),
      ])
      for (const result of [members, characters, newMembers, newCharacters]) if (result.error) throw fromPostgresError(result.error)
      return { members: members.count ?? 0, characters: characters.count ?? 0, newMembers: newMembers.count ?? 0, newCharacters: newCharacters.count ?? 0 }
    },

    async deleteAccount(memberId) {
      // Anmeldungen und Freigaben hängen per Fremdschlüssel an Charakteren bzw. Profil
      const steps = [
        () => db.from('runs').delete().eq('organizer_id', memberId),
        () => db.from('run_participants').delete().eq('member_id', memberId),
        () => db.from('characters').delete().eq('member_id', memberId),
        () => db.from('board_notes').delete().eq('created_by', memberId),
        () => db.from('members').delete().eq('id', memberId),
      ]
      for (const step of steps) {
        const result = await step()
        if (result.error) throw fromPostgresError(result.error)
      }
    },
  }
}
