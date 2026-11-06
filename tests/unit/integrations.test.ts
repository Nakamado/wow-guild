import { describe, expect, it, vi } from 'vitest'
import { createTtlCache, IntegrationError, requestJson } from '../../server/lib/http'
import { withFallback } from '../../server/lib/resilience'
import { classifySupabaseKey, normalizeSupabaseUrl } from '../../server/lib/supabase-config'
import { resilientTwitch } from '../../server/providers/live'
import { accessLevelFromRoles } from '../../shared/domain/permissions'
import { createDiscordBotClient, createDiscordEventProvider, createDiscordMemberProvider, fetchOwnGuildMember } from '../../server/providers/discord'
import { discordAvatarUrl, scheduledEventToDiscordEvent } from '../../server/providers/discord/normalize'
import { createTwitchClient, createTwitchProvider, streamToStatus } from '../../server/providers/twitch'
import { rowToRun, type RunRow } from '../../server/repositories/supabase/mappers'
import { rowToMember } from '../../server/repositories/supabase/members'
import { fromPostgresError } from '../../server/repositories/errors'
import { safeReturnPath } from '../../shared/utils/return-path'
import { CommunityMemberSchema } from '../../shared/schemas/community'
import { ClipSchema, StreamerSchema, StreamStatusSchema } from '../../shared/schemas/twitch'
import { DiscordEventSchema } from '../../shared/schemas/events'
import { GroupRunSchema } from '../../shared/schemas/groups'

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } })

/** Fetch-Attrappe: beantwortet Anfragen der Reihe nach und merkt sich die URLs */
function mockFetch(...responses: (Response | ((url: string) => Response))[]) {
  const calls: { url: string, init?: RequestInit }[] = []
  const fn = vi.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init })
    const next = responses.shift()
    if (!next) throw new Error(`Unerwarteter Aufruf: ${url}`)
    return typeof next === 'function' ? next(url) : next
  })
  return { fetch: fn, calls }
}

const noSleep = async () => {}

const discordMember = (id: string, roles: string[], extra: Record<string, unknown> = {}) => ({
  user: { id, username: `user${id}`, global_name: `Global ${id}`, avatar: null },
  nick: null,
  roles,
  joined_at: '2026-01-01T00:00:00.000Z',
  ...extra,
})

describe('requestJson', () => {
  it('versucht es bei 429 nach Retry-After einmal erneut', async () => {
    const sleep = vi.fn(noSleep)
    const { fetch } = mockFetch(json({ retry_after: 0.5 }, 429), json({ ok: true }))
    await expect(requestJson('https://example.test/a', {}, { service: 'discord', fetch, sleep })).resolves.toEqual({ ok: true })
    expect(sleep).toHaveBeenCalledWith(500)
  })

  it('wirft verständliche Fehler ohne Query-Parameter', async () => {
    const { fetch } = mockFetch(json({}, 403))
    const error = await requestJson('https://example.test/a?token=geheim', {}, { service: 'twitch', fetch, sleep: noSleep }).catch(e => e)
    expect(error).toBeInstanceOf(IntegrationError)
    expect(error.status).toBe(403)
    expect(error.message).not.toContain('geheim')
  })
})

describe('createTtlCache', () => {
  it('liefert innerhalb der TTL den gespeicherten Wert und cacht keine Fehler', async () => {
    const cache = createTtlCache()
    const load = vi.fn().mockRejectedValueOnce(new Error('weg')).mockResolvedValue(42)
    await expect(cache.get('k', 1000, load, 0)).rejects.toThrow('weg')
    await Promise.resolve()
    expect(await cache.get('k', 1000, load, 1)).toBe(42)
    expect(await cache.get('k', 1000, load, 2)).toBe(42)
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('Discord', () => {
  const config = { guildId: '723275162971275335', memberRoleId: 'role-member', adminRoleId: 'role-admin' }

  it('lädt Mitglieder seitenweise und zeigt nur Träger der Gildenrolle', async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => discordMember(String(1000 + index), index === 0 ? ['role-member', 'role-admin'] : []))
    const { fetch, calls } = mockFetch(
      json(firstPage),
      json([discordMember('5000', ['role-member']), { ...discordMember('5001', ['role-member']), user: { id: '5001', username: 'bot', avatar: null, bot: true } }]),
    )
    const provider = createDiscordMemberProvider(createDiscordBotClient('bot-token', { fetch, sleep: noSleep }), config)
    const members = await provider.listGuildMembers()

    expect(calls[0]!.url).toContain('/guilds/723275162971275335/members?limit=1000&after=0')
    expect(calls[1]!.url).toContain('after=1999')
    expect(calls[0]!.init?.headers).toMatchObject({ Authorization: 'Bot bot-token' })
    expect(members.map(member => member.id)).toEqual(['1000', '5000'])
    expect(members[0]).toMatchObject({ isAdmin: true, displayName: 'Global 1000', source: 'discord' })
    for (const member of members) expect(() => CommunityMemberSchema.parse(member)).not.toThrow()
  })

  it('meldet fehlende Servermitgliedschaft als null', async () => {
    const { fetch } = mockFetch(json({ message: 'Unknown Guild' }, 404))
    await expect(fetchOwnGuildMember('token', '1', { fetch, sleep: noSleep })).resolves.toBeNull()
  })

  it('normalisiert Scheduled Events mit Link und Status', async () => {
    const raw = {
      id: '999',
      guild_id: '723275162971275335',
      name: 'Gildentreffen',
      description: null,
      scheduled_start_time: '2026-12-01T19:00:00+00:00',
      scheduled_end_time: null,
      status: 4,
      creator: { id: '1', username: 'leitung', global_name: null, avatar: null },
    }
    const event = scheduledEventToDiscordEvent(raw)
    expect(event).toMatchObject({ status: 'cancelled', organizerName: 'leitung', url: 'https://discord.com/events/723275162971275335/999' })
    expect(() => DiscordEventSchema.parse(event)).not.toThrow()

    const { fetch } = mockFetch(json([raw]))
    const provider = createDiscordEventProvider(createDiscordBotClient('t', { fetch, sleep: noSleep }), config)
    expect(await provider.listScheduledEvents()).toHaveLength(1)
  })

  it('baut Avatar-URLs (Server-Avatar, Profil, Standard)', () => {
    const user = { id: '80351110224678912', username: 'x', avatar: 'abc' }
    expect(discordAvatarUrl(user, 'g', 'srv')).toContain('/guilds/g/users/80351110224678912/avatars/srv.png')
    expect(discordAvatarUrl(user)).toContain('/avatars/80351110224678912/abc.png')
    expect(discordAvatarUrl({ ...user, avatar: null })).toMatch(/\/embed\/avatars\/[0-5]\.png$/)
  })
})

describe('Twitch', () => {
  const token = () => json({ access_token: 'app-token', expires_in: 3600, token_type: 'bearer' })
  const clip = (id: string, views: number, createdAt: string) => ({
    id, url: `https://clips.twitch.tv/${id}`, embed_url: `https://clips.twitch.tv/embed?clip=${id}`,
    broadcaster_name: 'Miinyu', creator_name: 'Fan', title: ` Clip ${id} `, view_count: views,
    created_at: createdAt, thumbnail_url: 'https://static-cdn.jtvnw.net/x.jpg', duration: 28.4,
  })

  it('holt ein App-Token und nutzt es für Helix', async () => {
    const { fetch, calls } = mockFetch(token(), json({ data: [] }))
    const provider = createTwitchProvider(createTwitchClient('cid', 'secret', { fetch, sleep: noSleep }), { broadcasterId: '114422810', channel: 'miinyu', streamers: [] })
    const status = await provider.getStreamStatus()

    expect(calls[0]!.url).toBe('https://id.twitch.tv/oauth2/token')
    expect(calls[1]!.url).toBe('https://api.twitch.tv/helix/streams?user_id=114422810')
    expect(calls[1]!.init?.headers).toMatchObject({ 'Client-Id': 'cid', 'Authorization': 'Bearer app-token' })
    expect(status).toMatchObject({ isLive: false, viewerCount: null })
    expect(() => StreamStatusSchema.parse(status)).not.toThrow()
  })

  it('erneuert das Token einmal bei 401', async () => {
    const { fetch, calls } = mockFetch(token(), json({}, 401), token(), json({ data: [] }))
    const client = createTwitchClient('cid', 'secret', { fetch, sleep: noSleep })
    await expect(client.getStreams({ userIds: ['1'] })).resolves.toEqual([])
    expect(calls).toHaveLength(4)
  })

  it('normalisiert Livestatus', () => {
    const status = streamToStatus('miinyu', {
      user_id: '1', user_login: 'miinyu', user_name: 'Miinyu', game_name: 'World of Warcraft',
      type: 'live', title: 'Raid!', viewer_count: 120, started_at: '2026-11-04T18:00:00Z',
    }, new Date('2026-11-04T19:00:00Z'))
    expect(status).toMatchObject({ isLive: true, title: 'Raid!', viewerCount: 120 })
  })

  it('filtert Clips nach Zeitraum und sortiert nach Datum oder Aufrufen', async () => {
    const now = new Date('2026-11-04T12:00:00Z')
    const { fetch, calls } = mockFetch(token(), json({ data: [clip('a', 10, '2026-11-03T10:00:00Z'), clip('b', 500, '2026-10-30T10:00:00Z')] }))
    const provider = createTwitchProvider(createTwitchClient('cid', 's', { fetch, sleep: noSleep }), { broadcasterId: '114422810', channel: 'miinyu', streamers: [] }, () => now)

    const recent = await provider.listClips({ period: '7d', sort: 'recent', limit: 10 })
    expect(calls[1]!.url).toContain('started_at=2026-10-28T12%3A00%3A00.000Z')
    // ohne ended_at würde Twitch nur eine Woche ab started_at liefern
    expect(calls[1]!.url).toContain('ended_at=2026-11-04T12%3A00%3A00.000Z')
    expect(recent.map(entry => entry.id)).toEqual(['a', 'b'])
    expect(recent[0]!.title).toBe('Clip a')
    for (const entry of recent) expect(() => ClipSchema.parse(entry)).not.toThrow()

    // zweiter Aufruf kommt aus dem Cache
    const popular = await provider.listClips({ period: '7d', sort: 'popular', limit: 1 })
    expect(popular.map(entry => entry.id)).toEqual(['b'])
    expect(calls).toHaveLength(2)
  })

  it('zeigt nur Clips aus den konfigurierten Kategorien und blättert dafür weiter', async () => {
    const wow = (id: string, views: number) => ({ ...clip(id, views, '2026-11-03T10:00:00Z'), game_id: '18122' })
    const other = (id: string) => ({ ...clip(id, 999, '2026-11-03T10:00:00Z'), game_id: '509658' })
    const { fetch, calls } = mockFetch(
      token(),
      json({ data: [{ id: '18122', name: 'World of Warcraft' }] }),
      json({ data: [other('x'), wow('a', 10)], pagination: { cursor: 'next' } }),
      json({ data: [wow('b', 50), other('y')], pagination: {} }),
    )
    const provider = createTwitchProvider(createTwitchClient('cid', 's', { fetch, sleep: noSleep }), {
      broadcasterId: '1', channel: 'miinyu', streamers: [], clipGames: ['World of Warcraft', 'World of Warcraft: Forever'],
    })
    const clips = await provider.listClips({ period: 'all', sort: 'popular', limit: 10 })
    expect(calls[1]!.url).toBe('https://api.twitch.tv/helix/games?name=World+of+Warcraft&name=World+of+Warcraft%3A+Forever')
    expect(calls[3]!.url).toContain('after=next')
    expect(clips.map(entry => entry.id)).toEqual(['b', 'a'])
  })

  it('zeigt alle Clips, wenn keine Kategorie gefunden wird', async () => {
    const { fetch } = mockFetch(token(), json({ data: [] }), json({ data: [clip('a', 1, '2026-11-03T10:00:00Z')], pagination: { cursor: 'next' } }))
    const provider = createTwitchProvider(createTwitchClient('cid', 's', { fetch, sleep: noSleep }), {
      broadcasterId: '1', channel: 'miinyu', streamers: [], clipGames: ['Gibt es nicht'],
    })
    expect((await provider.listClips({ period: 'all', sort: 'recent', limit: 10 })).map(entry => entry.id)).toEqual(['a'])
  })

  it('verknüpft Streamer nur über die Konfiguration mit Mitgliedern', async () => {
    const { fetch } = mockFetch(
      token(),
      (url: string) => url.includes('/users')
        ? json({ data: [{ id: '7', login: 'gast', display_name: 'Gast', profile_image_url: 'https://static-cdn.jtvnw.net/p.png' }] })
        : json({ data: [{ user_id: '7', user_login: 'gast', user_name: 'Gast', type: 'live', viewer_count: 3, started_at: '2026-11-04T10:00:00Z' }] }),
      (url: string) => url.includes('/users')
        ? json({ data: [{ id: '7', login: 'gast', display_name: 'Gast', profile_image_url: 'https://static-cdn.jtvnw.net/p.png' }] })
        : json({ data: [{ user_id: '7', user_login: 'gast', user_name: 'Gast', type: 'live', viewer_count: 3, started_at: '2026-11-04T10:00:00Z' }] }),
    )
    const provider = createTwitchProvider(createTwitchClient('cid', 's', { fetch, sleep: noSleep }), {
      broadcasterId: '1', channel: 'miinyu', streamers: [{ login: 'Gast', discordId: '123456789' }],
    })
    const [streamer] = await provider.listStreamers()
    expect(streamer).toMatchObject({ login: 'gast', isLive: true, memberId: '123456789' })
    expect(() => StreamerSchema.parse(streamer)).not.toThrow()
  })
})

describe('Supabase-Mapper', () => {
  it('teilt Anmeldungen in feste Plätze und Warteliste (nach Zeit sortiert)', () => {
    const row: RunRow = {
      id: '11111111-1111-4111-8111-111111111111', dungeon_slug: 'deadmines', title: null, description: '',
      starts_at: '2026-12-01T18:00:00.123456+00:00', organizer_id: '100000000000000001', status: 'open',
      capacity_tank: 1, capacity_healer: 1, capacity_dps: 3, waitlist_enabled: true, discord_event_id: null,
      created_at: '2026-11-01T10:00:00+00:00', updated_at: '2026-11-01T10:00:00+00:00',
      run_participants: [
        { member_id: 'b', character_id: 'cb', role: 'tank', placement: 'waitlist', joined_at: '2026-11-02T10:00:00+00:00' },
        { member_id: 'a', character_id: 'ca', role: 'tank', placement: 'participant', joined_at: '2026-11-01T10:00:00+00:00' },
      ],
    }
    const run = rowToRun(row)
    expect(run.participants.map(entry => entry.memberId)).toEqual(['a'])
    expect(run.waitlist.map(entry => entry.memberId)).toEqual(['b'])
    expect(run.startsAt).toBe('2026-12-01T18:00:00.123Z')
    expect(() => GroupRunSchema.parse(run)).not.toThrow()
  })

  it('übersetzt Fehlercodes aus join_run()', () => {
    expect(fromPostgresError({ code: 'P0001', message: 'role-full' })).toMatchObject({ code: 'role-full', status: 409 })
    expect(fromPostgresError({ code: '23505', message: 'duplicate key' })).toMatchObject({ code: 'name-taken' })
  })
})

describe('safeReturnPath', () => {
  it('erlaubt nur relative Pfade der eigenen Seite', () => {
    expect(safeReturnPath('/gruppen?x=1')).toBe('/gruppen?x=1')
    expect(safeReturnPath('//evil.example')).toBe('/')
    expect(safeReturnPath('https://evil.example')).toBe('/')
    expect(safeReturnPath('/\\evil.example')).toBe('/')
    expect(safeReturnPath(undefined)).toBe('/')
  })
})

describe('Robustheit', () => {
  it('liefert nach einem Fehler Ersatzdaten und fragt erst nach der Pause erneut an', async () => {
    let time = 0
    const action = vi.fn().mockRejectedValueOnce(new Error('twitch 400')).mockResolvedValue('echt')
    const log = vi.fn()
    const guarded = withFallback(action, { label: 'test', fallback: () => 'ersatz', cooldownMs: 1000, now: () => time, log })

    expect(await guarded()).toBe('ersatz')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('[test] nicht erreichbar (twitch 400)'))
    time = 500
    expect(await guarded()).toBe('ersatz')
    expect(action).toHaveBeenCalledTimes(1)
    time = 1500
    expect(await guarded()).toBe('echt')
  })

  it('meldet Twitch-Ausfälle als „offline“ statt als Fehler', async () => {
    const broken = {
      getStreamStatus: () => Promise.reject(new Error('down')),
      listClips: () => Promise.reject(new Error('down')),
      listStreamers: () => Promise.reject(new Error('down')),
    }
    const provider = resilientTwitch(broken, 'miinyu')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(provider.getStreamStatus()).resolves.toMatchObject({ channel: 'miinyu', isLive: false })
    await expect(provider.listStreamers()).resolves.toEqual([])
    await expect(provider.listClips({ period: '7d', sort: 'recent', limit: 3 })).rejects.toMatchObject({ statusCode: 503 })
    warn.mockRestore()
  })
})

describe('Supabase-Konfiguration', () => {
  it('bereinigt die Projekt-URL', () => {
    expect(normalizeSupabaseUrl('https://abc.supabase.co/rest/v1/')).toBe('https://abc.supabase.co')
    expect(normalizeSupabaseUrl(' https://abc.supabase.co/ ')).toBe('https://abc.supabase.co')
  })

  it('erkennt öffentliche und geheime Keys', () => {
    const jwt = (role: string) => `x.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.y`
    expect(classifySupabaseKey('sb_secret_abc')).toBe('secret')
    expect(classifySupabaseKey('sb_publishable_abc')).toBe('public')
    expect(classifySupabaseKey(jwt('anon'))).toBe('public')
    expect(classifySupabaseKey(jwt('service_role'))).toBe('secret')
    expect(classifySupabaseKey('irgendwas')).toBe('unknown')
  })
})

describe('Mehrere Rollen-IDs', () => {
  it('akzeptiert kommagetrennte Admin-Rollen', () => {
    const config = { memberRoleId: 'wow', adminRoleId: 'admin, mod' }
    expect(accessLevelFromRoles(['mod'], config)).toBe('admin')
    expect(accessLevelFromRoles(['wow'], config)).toBe('member')
    expect(accessLevelFromRoles(['andere'], config)).toBe('user')
  })
})

describe('Mitglieder aus Supabase', () => {
  it('normalisiert Profile auf CommunityMember', () => {
    const member = rowToMember({ id: '100000000000000001', display_name: 'Nakamado', avatar_url: null, is_guild_member: true, is_admin: true })
    expect(member).toMatchObject({ discordId: '100000000000000001', profileUrl: 'https://discord.com/users/100000000000000001', isAdmin: true })
    expect(() => CommunityMemberSchema.parse(member)).not.toThrow()
  })
})
