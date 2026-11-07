import { readdirSync, readFileSync } from 'node:fs'
import { PGlite } from '@electric-sql/pglite'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Prüft die echte Migration in einem eingebetteten Postgres (PGlite).
 * Gleichzeitigkeit lässt sich hier nicht nachstellen (eine Verbindung) – die Sperre
 * übernimmt `SELECT … FOR UPDATE`; getestet werden Regeln und Constraints.
 */
const dir = new URL('../../supabase/migrations/', import.meta.url)
let db: PGlite

const ALICE = '100000000000000001'
const BOB = '100000000000000002'
const CARL = '100000000000000003'
const DANA = '100000000000000004'

beforeAll(async () => {
  db = new PGlite()
  for (const file of readdirSync(dir).filter(name => name.endsWith('.sql')).sort()) {
    await db.exec(readFileSync(new URL(file, dir), 'utf8'))
  }
}, 30_000)

afterAll(async () => {
  await db.close()
})

beforeEach(async () => {
  await db.exec('delete from run_participants; delete from runs; delete from characters; delete from members; delete from board_notes; delete from guild_milestones;')
})

async function character(memberId: string, firstName: string, options: { isMain?: boolean, roles?: string[] } = {}) {
  const { rows } = await db.query<{ id: string }>(
    `insert into characters (member_id, name, realm, faction, class_id, race_id, level, roles, is_main)
     values ($1, $2, 'Testrealm', 'alliance', 'warrior', 'human', 60, $3, $4) returning id`,
    [memberId, `${firstName} Test`, options.roles ?? ['tank', 'dps'], options.isMain ?? false],
  )
  return rows[0]!.id
}

async function run(options: { tank?: number, healer?: number, dps?: number, waitlist?: boolean, startsInHours?: number } = {}) {
  const { rows } = await db.query<{ id: string }>(
    `insert into runs (dungeon_slug, starts_at, organizer_id, capacity_tank, capacity_healer, capacity_dps, waitlist_enabled)
     values ('deadmines', now() + make_interval(hours => $1), $2, $3, $4, $5, $6) returning id`,
    [options.startsInHours ?? 24, ALICE, options.tank ?? 1, options.healer ?? 1, options.dps ?? 3, options.waitlist ?? false],
  )
  return rows[0]!.id
}

const join = (runId: string, memberId: string, characterId: string, role: string) =>
  db.query<{ join_run: string }>('select join_run($1, $2, $3, $4)', [runId, memberId, characterId, role]).then(result => result.rows[0]!.join_run)

const leave = (runId: string, memberId: string) =>
  db.query<{ leave_run: string | null }>('select leave_run($1, $2)', [runId, memberId]).then(result => result.rows[0]!.leave_run)

describe('join_run()', () => {
  it('vergibt feste Plätze bis zur Kapazität', async () => {
    const runId = await run({ tank: 1 })
    expect(await join(runId, ALICE, await character(ALICE, 'Alice'), 'tank')).toBe('participant')
    await expect(join(runId, BOB, await character(BOB, 'Bob'), 'tank')).rejects.toThrow('role-full')
  })

  it('setzt bei voller Rolle auf die Warteliste, wenn aktiviert', async () => {
    const runId = await run({ tank: 1, waitlist: true })
    await join(runId, ALICE, await character(ALICE, 'Alice'), 'tank')
    expect(await join(runId, BOB, await character(BOB, 'Bob'), 'tank')).toBe('waitlist')
  })

  it('verhindert Doppelanmeldungen von Mitglied und Charakter', async () => {
    const runId = await run({ dps: 3 })
    const alice = await character(ALICE, 'Alice')
    await join(runId, ALICE, alice, 'dps')
    await expect(join(runId, ALICE, await character(ALICE, 'Alicetwink'), 'dps')).rejects.toThrow('already-joined')
  })

  it('lehnt fremde Charaktere, abgesagte und begonnene Runs ab', async () => {
    const alice = await character(ALICE, 'Alice')
    await expect(join(await run(), BOB, alice, 'dps')).rejects.toThrow('character-not-owned')

    const cancelled = await run()
    await db.query(`update runs set status = 'cancelled' where id = $1`, [cancelled])
    await expect(join(cancelled, ALICE, alice, 'dps')).rejects.toThrow('run-not-open')

    await expect(join(await run({ startsInHours: -1 }), ALICE, alice, 'dps')).rejects.toThrow('run-started')
  })

  it('lässt Rollen ohne Plätze nicht zu', async () => {
    const runId = await run({ healer: 0 })
    await expect(join(runId, ALICE, await character(ALICE, 'Alice'), 'healer')).rejects.toThrow('role-full')
  })
})

describe('leave_run()', () => {
  it('lässt die erste Person derselben Rolle von der Warteliste nachrücken', async () => {
    const runId = await run({ tank: 1, dps: 1, waitlist: true })
    await join(runId, ALICE, await character(ALICE, 'Alice'), 'tank')
    await join(runId, BOB, await character(BOB, 'Bob'), 'dps') // andere Rolle
    await join(runId, CARL, await character(CARL, 'Carl'), 'tank')
    await join(runId, DANA, await character(DANA, 'Dana'), 'tank')

    expect(await leave(runId, ALICE)).toBe(CARL)
    const { rows } = await db.query<{ member_id: string, placement: string }>(
      'select member_id, placement from run_participants where run_id = $1 order by joined_at', [runId],
    )
    expect(rows).toEqual([
      { member_id: BOB, placement: 'participant' },
      { member_id: CARL, placement: 'participant' },
      { member_id: DANA, placement: 'waitlist' },
    ])
  })

  it('rückt nicht nach, wenn jemand von der Warteliste geht', async () => {
    const runId = await run({ tank: 1, waitlist: true })
    await join(runId, ALICE, await character(ALICE, 'Alice'), 'tank')
    await join(runId, BOB, await character(BOB, 'Bob'), 'tank')
    expect(await leave(runId, BOB)).toBeNull()
  })

  it('meldet fehlende Anmeldung', async () => {
    await expect(leave(await run(), ALICE)).rejects.toThrow('not-joined')
  })
})

describe('Constraints', () => {
  it('erlaubt höchstens einen Hauptcharakter und tauscht ihn atomar', async () => {
    const main = await character(ALICE, 'Alice', { isMain: true })
    const twink = await character(ALICE, 'Alicetwink')
    await expect(db.query(`update characters set is_main = true where id = $1`, [twink])).rejects.toThrow()

    await db.query('select set_main_character($1, $2)', [ALICE, twink])
    const { rows } = await db.query<{ id: string }>('select id from characters where member_id = $1 and is_main', [ALICE])
    expect(rows.map(row => row.id)).toEqual([twink])
    expect(main).not.toBe(twink)
  })

  it('prüft Werte (Stufe, Rollen, Kapazität)', async () => {
    await expect(db.query(
      `insert into characters (member_id, name, realm, faction, class_id, race_id, level, roles)
       values ($1, 'Zu Hoch', 'R', 'alliance', 'mage', 'human', 61, '{dps}')`, [ALICE],
    )).rejects.toThrow()
    await expect(db.query(
      `insert into characters (member_id, name, realm, faction, class_id, race_id, level, roles)
       values ($1, 'Falsche Rolle', 'R', 'alliance', 'mage', 'human', 10, '{dancer}')`, [ALICE],
    )).rejects.toThrow()
    await expect(run({ tank: 0, healer: 0, dps: 0 })).rejects.toThrow()
    await expect(db.query(
      `insert into characters (member_id, name, realm, faction, class_id, race_id, level, roles)
       values ($1, 'Ohnenachname', 'R', 'alliance', 'mage', 'human', 10, '{dps}')`, [ALICE],
    )).rejects.toThrow()
  })

  it('entfernt Anmeldungen gelöschter Charaktere mit', async () => {
    const alice = await character(ALICE, 'Alice')
    await join(await run(), ALICE, alice, 'dps')
    await db.query('delete from characters where id = $1', [alice])
    const { rows } = await db.query('select * from run_participants')
    expect(rows).toHaveLength(0)
  })

  it('speichert Mitgliederprofile per Upsert und prüft Werte', async () => {
    const upsert = `insert into members (id, display_name, avatar_url, is_guild_member) values ($1, $2, $3, $4)
      on conflict (id) do update set display_name = excluded.display_name, is_guild_member = excluded.is_guild_member`
    await db.query(upsert, [ALICE, 'Alice', 'https://cdn.discordapp.com/a.png', true])
    await db.query(upsert, [ALICE, 'Alice Neu', null, false])
    const { rows } = await db.query<{ display_name: string, is_guild_member: boolean }>('select display_name, is_guild_member from members')
    expect(rows).toEqual([{ display_name: 'Alice Neu', is_guild_member: false }])
    await expect(db.query(upsert, ['keine-id', 'X', null, true])).rejects.toThrow()
    await expect(db.query(upsert, [BOB, 'Bob', 'http://unsicher.example', true])).rejects.toThrow()
  })

  it('hat RLS auf allen Tabellen aktiv', async () => {
    const { rows } = await db.query<{ relname: string, relrowsecurity: boolean }>(
      `select relname, relrowsecurity from pg_class where relname in ('characters', 'runs', 'run_participants', 'members') order by relname`,
    )
    expect(rows.every(row => row.relrowsecurity)).toBe(true)
    expect(rows).toHaveLength(4)
  })
})

describe('Mitglieder-Einstellungen und Chronik', () => {
  it('speichert Opt-in, Streamer-Rolle und Twitch-Kanal mit sicheren Standardwerten', async () => {
    await db.query(`insert into members (id, display_name) values ($1, 'Alice')`, [ALICE])
    const { rows } = await db.query<{ leaderboard_opt_in: boolean, is_streamer: boolean, twitch_login: string | null }>('select leaderboard_opt_in, is_streamer, twitch_login from members')
    expect(rows).toEqual([{ leaderboard_opt_in: false, is_streamer: false, twitch_login: null }])
    await db.query(`update members set twitch_login = 'mein_kanal_1' where id = $1`, [ALICE])
    await expect(db.query(`update members set twitch_login = 'Gross' where id = $1`, [ALICE])).rejects.toThrow()
    await expect(db.query(`update members set twitch_login = 'https://twitch.tv/x' where id = $1`, [ALICE])).rejects.toThrow()
  })

  it('legt jeden Meilenstein nur einmal an', async () => {
    const insert = `insert into guild_milestones (dedupe_key, milestone) values ($1, $2) on conflict (dedupe_key) do nothing`
    await db.query(insert, ['members.threshold:10', { id: 'members-10' }])
    await db.query(insert, ['members.threshold:10', { id: 'anders' }])
    const { rows } = await db.query<{ milestone: { id: string } }>('select milestone from guild_milestones')
    expect(rows).toEqual([{ milestone: { id: 'members-10' } }])
    const rls = await db.query<{ relrowsecurity: boolean }>(`select relrowsecurity from pg_class where relname = 'guild_milestones'`)
    expect(rls.rows[0]!.relrowsecurity).toBe(true)
  })
})

describe('board_notes', () => {
  it('speichert Aushänge und prüft Titel, Text und Ersteller', async () => {
    const { rows } = await db.query<{ id: string, expires_on: string | null }>(
      `insert into board_notes (title, body, created_by) values ('100 Fische für den Raid', null, $1) returning id, expires_on`,
      [ALICE],
    )
    expect(rows[0]!.expires_on).toBeNull()
    await expect(db.query(`insert into board_notes (title, created_by) values ('   ', $1)`, [ALICE])).rejects.toThrow()
    await expect(db.query(`insert into board_notes (title, created_by) values ('x', 'kein-discord')`)).rejects.toThrow()
    await expect(db.query(`insert into board_notes (title, body, created_by) values ('x', $1, $2)`, ['a'.repeat(401), ALICE])).rejects.toThrow()
  })
})
