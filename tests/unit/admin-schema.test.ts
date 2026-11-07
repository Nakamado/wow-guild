import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Migration für Adminbereich, Protokoll und Ranglistenfreigaben gegen bestehende Daten:
 * alle früheren Migrationen ausführen, Daten anlegen, dann die neue Migration – nichts darf verloren gehen.
 */
const dir = new URL('../../supabase/migrations/', import.meta.url)
const NEW_MIGRATION = '20261109000000_admin_activity_consent.sql'
const SUPER = '591736149647687697'
const MIINYU = '291187664994959360'
const MEMBER = '100000000000000003'
let db: PGlite

async function character(memberId: string, name: string) {
  const { rows } = await db.query<{ id: string }>(
    `insert into characters (member_id, name, realm, faction, class_id, race_id, level, roles)
     values ($1, $2, 'PvE', 'alliance', 'warrior', 'human', 20, '{dps}') returning id`,
    [memberId, name],
  )
  return rows[0]!.id
}

const grant = (memberId: string, characterId: string, extra = '') =>
  db.query(`insert into leaderboard_grants (member_id, character_id, consent_channel, consent_date, granted_by${extra ? ', evidence_path' : ''})
    values ($1, $2, 'discord-message', '2026-11-07', $3${extra ? ', $4' : ''})`, extra ? [memberId, characterId, SUPER, extra] : [memberId, characterId, SUPER])

beforeAll(async () => {
  db = new PGlite()
  const files = readdirSync(dir).filter(name => name.endsWith('.sql')).sort()
  for (const file of files.filter(name => name < NEW_MIGRATION)) await db.exec(readFileSync(new URL(file, dir), 'utf8'))
  // Bestand vor der Migration: Miinyu Admin, ein Mitglied mit Ranglisten-Zustimmung
  await db.query(`insert into members (id, display_name, is_guild_member, is_admin) values ($1, 'Minyu', true, true), ($2, 'Nak', true, false), ($3, 'Mitglied', true, false)`, [MIINYU, SUPER, MEMBER])
  await db.query(`update members set leaderboard_opt_in = true where id = $1`, [MEMBER])
  await character(MEMBER, 'Bestand Held')
  for (const file of files.filter(name => name >= NEW_MIGRATION)) await db.exec(readFileSync(new URL(file, dir), 'utf8'))
}, 30_000)

afterAll(async () => {
  await db.close()
})

describe('Migration Adminbereich', () => {
  it('erhält Adminrechte, Zustimmungen und Charaktere und erzeugt keine Freigaben', async () => {
    const { rows } = await db.query<{ id: string, is_admin: boolean, leaderboard_opt_in: boolean, privacy_notice_version: number }>(
      'select id, is_admin, leaderboard_opt_in, privacy_notice_version from members order by display_name',
    )
    expect(rows).toEqual([
      { id: MIINYU, is_admin: true, leaderboard_opt_in: false, privacy_notice_version: 0 },
      { id: MEMBER, is_admin: false, leaderboard_opt_in: true, privacy_notice_version: 0 },
      { id: SUPER, is_admin: false, leaderboard_opt_in: false, privacy_notice_version: 0 },
    ])
    expect((await db.query('select * from characters')).rows).toHaveLength(1)
    expect((await db.query('select * from leaderboard_grants')).rows).toHaveLength(0)
    expect((await db.query('select * from activity_log')).rows).toHaveLength(0)
  })

  it('erlaubt je Charakter nur eine aktive Freigabe, nach Widerruf eine neue', async () => {
    const id = await character(MEMBER, 'Freigabe Test')
    await grant(MEMBER, id)
    await expect(grant(MEMBER, id)).rejects.toThrow()
    await db.query(`update leaderboard_grants set revoked_at = now(), revoked_reason = 'member' where character_id = $1`, [id])
    await grant(MEMBER, id)
    // Widerruf nur mit Grund und umgekehrt
    await expect(db.query(`update leaderboard_grants set revoked_at = now() where character_id = $1 and revoked_at is null`, [id])).rejects.toThrow()
  })

  it('akzeptiert als Nachweis nur Dateinamen im privaten Schema', async () => {
    const id = await character(MEMBER, 'Nachweis Test')
    await expect(grant(MEMBER, id, 'https://öffentlich.example/bild.png')).rejects.toThrow()
    await expect(grant(MEMBER, id, '../geheim.png')).rejects.toThrow()
    await grant(MEMBER, id, '3f1c2a7e-5b4d-4c8e-9a1f-2b3c4d5e6f70.webp')
  })

  it('räumt Freigaben mit gelöschten Charakteren bzw. Konten mit auf', async () => {
    const id = await character(MEMBER, 'Kaskade Test')
    await grant(MEMBER, id)
    await db.query('delete from characters where id = $1', [id])
    expect((await db.query('select * from leaderboard_grants where character_id = $1', [id])).rows).toHaveLength(0)

    await db.query(`insert into members (id, display_name) values ('100000000000000009', 'Geht')`)
    const gone = await character('100000000000000009', 'Konto Weg')
    await grant('100000000000000009', gone)
    await db.query(`delete from members where id = '100000000000000009'`)
    expect((await db.query('select * from leaderboard_grants where member_id = $1', ['100000000000000009'])).rows).toHaveLength(0)
  })

  it('löscht abgelaufene Protokolleinträge und behält die übrigen', async () => {
    const insert = `insert into activity_log (action, actor_id, subject_type, subject_id, summary, retain_until, occurred_at) values ($1, $2, 'member', $2, 'Test', $3, $4)`
    await db.query(insert, ['account.registered', MEMBER, '2026-11-01T00:00:00Z', '2026-08-01T00:00:00Z'])
    await db.query(insert, ['character.added', MEMBER, '2027-02-05T00:00:00Z', '2026-11-07T00:00:00Z'])
    // gleiche Abfrage wie der Cron-Job (retain_until < jetzt)
    await db.query(`delete from activity_log where retain_until < $1`, ['2026-11-07T12:00:00Z'])
    const { rows } = await db.query<{ action: string }>('select action from activity_log')
    expect(rows).toEqual([{ action: 'character.added' }])
    // keine IP-Adressen oder ganzen Datensätze: nur die vorgesehenen Spalten
    const columns = await db.query<{ column_name: string }>(`select column_name from information_schema.columns where table_name = 'activity_log' order by ordinal_position`)
    expect(columns.rows.map(row => row.column_name)).toEqual(['id', 'occurred_at', 'action', 'actor_id', 'subject_type', 'subject_id', 'summary', 'retain_until'])
    await expect(db.query(`insert into activity_log (action, subject_type, summary, retain_until) values ('Login', 'member', 'x', now())`)).rejects.toThrow()
  })

  it('hat RLS auf den neuen Tabellen aktiv', async () => {
    const { rows } = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname in ('activity_log', 'leaderboard_grants')`)
    expect(rows).toHaveLength(2)
    expect(rows.every(row => row.relrowsecurity)).toBe(true)
  })
})
