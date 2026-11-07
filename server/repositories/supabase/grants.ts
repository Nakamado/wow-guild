import type { SupabaseClient } from '@supabase/supabase-js'
import type { LeaderboardGrant, LeaderboardGrantInput } from '#shared/schemas/admin'
import { fromPostgresError, RepositoryError } from '../errors'

/** Privater Storage-Bucket für Zustimmungsnachweise (nie öffentlich) */
export const EVIDENCE_BUCKET = 'consent-evidence'

interface GrantRow {
  id: string
  member_id: string
  character_id: string
  consent_channel: LeaderboardGrant['consentChannel']
  consent_date: string
  note: string | null
  evidence_path: string | null
  granted_by: string
  created_at: string
  revoked_at: string | null
  revoked_reason: LeaderboardGrant['revokedReason']
}

const toGrant = (row: GrantRow): LeaderboardGrant => ({
  id: row.id,
  memberId: row.member_id,
  characterId: row.character_id,
  consentChannel: row.consent_channel,
  consentDate: row.consent_date,
  note: row.note,
  hasEvidence: Boolean(row.evidence_path),
  grantedBy: row.granted_by,
  createdAt: new Date(row.created_at).toISOString(),
  revokedAt: row.revoked_at ? new Date(row.revoked_at).toISOString() : null,
  revokedReason: row.revoked_reason,
})

export interface GrantStore {
  /** aktive Freigaben (für die Rangliste) */
  listActive(): Promise<LeaderboardGrant[]>
  /** alle Freigaben inkl. zurückgezogener (Adminbereich) */
  listAll(): Promise<LeaderboardGrant[]>
  get(id: string): Promise<(LeaderboardGrant & { evidencePath: string | null }) | null>
  create(input: Omit<LeaderboardGrantInput, 'confirmed'>, grantedBy: string, evidence: { path: string, bytes: Uint8Array, contentType: string } | null): Promise<LeaderboardGrant>
  revoke(id: string, reason: 'member' | 'admin'): Promise<void>
  /** Widerruf durch das Mitglied: alle aktiven Freigaben beenden; liefert die betroffenen Charakter-IDs */
  revokeAllForMember(memberId: string): Promise<string[]>
  readEvidence(path: string): Promise<Blob>
  deleteEvidence(id: string): Promise<void>
  /** Nachweise aller Freigaben eines Mitglieds löschen (vor dem Löschen des Kontos) */
  deleteEvidenceForMember(memberId: string): Promise<void>
  /** Zurückgezogene Freigaben nach Ablauf der Aufbewahrungsfrist löschen */
  purgeRevoked(before: Date): Promise<number>
}

/** Ranglistenfreigaben durch den Hauptadmin (Tabelle `leaderboard_grants`, Nachweise im privaten Bucket) */
export function createSupabaseGrantStore(db: SupabaseClient): GrantStore {
  const table = () => db.from('leaderboard_grants')
  const bucket = () => db.storage.from(EVIDENCE_BUCKET)

  async function removeFiles(paths: string[]) {
    if (!paths.length) return
    const result = await bucket().remove(paths)
    if (result.error) throw new RepositoryError('storage-failed', 'Der Nachweis konnte nicht gelöscht werden.')
  }

  async function rows(query: PromiseLike<{ data: unknown, error: { code?: string, message?: string } | null }>): Promise<GrantRow[]> {
    const result = await query
    if (result.error) throw fromPostgresError(result.error)
    return (result.data ?? []) as GrantRow[]
  }

  return {
    async listActive() {
      return (await rows(table().select('*').is('revoked_at', null))).map(toGrant)
    },
    async listAll() {
      return (await rows(table().select('*').order('created_at', { ascending: false }))).map(toGrant)
    },
    async get(id) {
      const [row] = await rows(table().select('*').eq('id', id).limit(1))
      return row ? { ...toGrant(row), evidencePath: row.evidence_path } : null
    },
    async create(input, grantedBy, evidence) {
      if (evidence) {
        const upload = await bucket().upload(evidence.path, evidence.bytes, { contentType: evidence.contentType, upsert: false })
        if (upload.error) throw new RepositoryError('storage-failed', 'Der Nachweis konnte nicht gespeichert werden. Ist der private Bucket „consent-evidence“ angelegt?')
      }
      const result = await table().insert({
        member_id: input.memberId,
        character_id: input.characterId,
        consent_channel: input.consentChannel,
        consent_date: input.consentDate,
        note: input.note,
        evidence_path: evidence?.path ?? null,
        granted_by: grantedBy,
      }).select('*').single()
      if (result.error) {
        if (evidence) await removeFiles([evidence.path]).catch(() => {})
        if (result.error.code === '23505') throw new RepositoryError('already-granted')
        throw fromPostgresError(result.error)
      }
      return toGrant(result.data as GrantRow)
    },
    async revoke(id, reason) {
      const [row] = await rows(table().update({ revoked_at: new Date().toISOString(), revoked_reason: reason }).eq('id', id).is('revoked_at', null).select('*'))
      // Nachweis wird mit dem Widerruf nicht mehr gebraucht – datensparsam sofort löschen
      if (row?.evidence_path) {
        await removeFiles([row.evidence_path])
        await table().update({ evidence_path: null }).eq('id', id)
      }
    },
    async revokeAllForMember(memberId) {
      const revoked = await rows(table().update({ revoked_at: new Date().toISOString(), revoked_reason: 'member' }).eq('member_id', memberId).is('revoked_at', null).select('*'))
      const paths = revoked.map(row => row.evidence_path).filter((path): path is string => Boolean(path))
      if (paths.length) {
        await removeFiles(paths)
        await table().update({ evidence_path: null }).in('id', revoked.map(row => row.id))
      }
      return revoked.map(row => row.character_id)
    },
    async readEvidence(path) {
      const result = await bucket().download(path)
      if (result.error || !result.data) throw new RepositoryError('not-found', 'Der Nachweis ist nicht (mehr) vorhanden.')
      return result.data
    },
    async deleteEvidence(id) {
      const [row] = await rows(table().select('*').eq('id', id).limit(1))
      if (!row?.evidence_path) return
      await removeFiles([row.evidence_path])
      const result = await table().update({ evidence_path: null }).eq('id', id)
      if (result.error) throw fromPostgresError(result.error)
    },
    async deleteEvidenceForMember(memberId) {
      const all = await rows(table().select('*').eq('member_id', memberId).not('evidence_path', 'is', null))
      await removeFiles(all.map(row => row.evidence_path!))
    },
    async purgeRevoked(before) {
      const purged = await rows(table().delete().lt('revoked_at', before.toISOString()).select('*'))
      await removeFiles(purged.map(row => row.evidence_path).filter((path): path is string => Boolean(path))).catch(() => {})
      return purged.length
    },
  }
}
