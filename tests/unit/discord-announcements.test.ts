import { describe, expect, it, vi } from 'vitest'
import type { GuildEvent, Participant } from '#shared/types'
import { createDiscordBotClient } from '../../server/providers/discord'
import { escapeDiscord, guildEventAnnouncement, runAnnouncement, runThreadLines, runThreadName } from '../../server/providers/discord/announcements'
import { dungeon, NOW, run } from './fixtures'

const p = (memberId: string, role: Participant['role'], extra: Partial<Participant> = {}): Participant => ({
  memberId, characterId: `c-${memberId}`, role, joinedAt: NOW.toISOString(), ...extra,
})
const SITE = 'https://www.mukimuki-forever.de'
const embedOf = (body: { embeds?: unknown[] }) => body.embeds![0] as { title: string, url: string, color: number, fields?: { name: string, value: string }[], description?: string }

describe('runAnnouncement', () => {
  it('kompakt: Dungeon, Questanzahl, Termin, Besetzung, offene Rollen – ohne Pings', () => {
    const body = runAnnouncement(run({
      id: 'r1', title: 'Abendrunde', organizerId: '591736149647687697', questIds: [1, 2, 3, 4, 5],
      participants: [p('1', 'tank'), p('2', 'dps', { support: true })],
    }), dungeon, SITE)
    const embed = embedOf(body)
    expect(embed.title).toBe('Abendrunde')
    expect(embed.url).toBe(`${SITE}/gruppen/r1`)
    expect(embed.fields).toBeUndefined()
    const lines = embed.description!.split('\n')
    expect(lines[0]).toBe('**Testgewölbe** · Stufe 20–26 · 5 Quests geplant')
    expect(lines[1]).toMatch(/^🗓️ <t:\d+:d>, <t:\d+:t> \(<t:\d+:R>\)$/)
    expect(lines.slice(2)).toEqual([
      '👥 2/5 · Tank 1/1 · Heiler 0/1 · Schaden 1/3 · 1 Supporter',
      'Organisation: <@591736149647687697>',
    ])
    expect(body.allowed_mentions).toEqual({ parse: [] })
    expect(JSON.stringify(body.components)).toContain('Zur Anmeldung')
  })

  it('abgesagt: grau, mit Grund und ohne Anmelde-Button', () => {
    const body = runAnnouncement(run({ status: 'cancelled', cancelReason: 'Krank' }), dungeon, SITE)
    const embed = embedOf(body)
    expect(embed.title).toBe('Abgesagt: Testgewölbe')
    expect(embed.description).toContain('❌ Abgesagt: Krank')
    expect(embed.description).not.toContain('👥')
    expect(body.components).toEqual([])
  })

  it('volle Gruppe mit Warteliste: Hinweis in der Besetzungszeile', () => {
    const full = run({ capacity: { tank: 1, healer: 0, dps: 0 }, waitlistEnabled: true, participants: [p('1', 'tank')], waitlist: [p('2', 'tank')] })
    expect(embedOf(runAnnouncement(full, dungeon, SITE)).description).toContain('👥 1/1 · Tank 1/1 · Warteliste (1)')
  })

  it('entschärft Markdown und Erwähnungen in Nutzertexten', () => {
    expect(escapeDiscord('**fett** @everyone <@123>')).toBe('\\*\\*fett\\*\\* @\u200Beveryone <\u200B@\u200B123\\>')
  })

  it('Thread-Name mit Datum und Uhrzeit', () => {
    expect(runThreadName(run({ startsAt: '2026-11-13T18:00:00.000Z' }), dungeon)).toBe('Testgewölbe · 13.11. 19:00')
  })
})

describe('runThreadLines', () => {
  const name = (id: string) => ({ 'c-1': 'Eisblume', 'c-2': 'Thorgrimm', 'c-3': 'Raureif' } as Record<string, string>)[id]

  it('An- und Abmeldung, Nachrücken, Supporter auf Warteliste, Rollentausch', () => {
    expect(runThreadLines(run(), run({ participants: [p('1', 'healer', { support: true })] }), name))
      .toEqual(['➕ **Eisblume** ist dabei als Heiler (Supporter).'])

    const before = run({ participants: [p('1', 'dps', { support: true }), p('2', 'healer', { altRole: 'dps' })], waitlist: [p('3', 'tank')] })
    const after = run({ participants: [p('2', 'dps', { altRole: 'healer', moved: true }), p('3', 'tank')], waitlist: [p('1', 'dps', { support: true })] })
    expect(runThreadLines(before, after, name)).toEqual([
      '⬆️ **Raureif** ist von der Warteliste nachgerückt (Tank).',
      '↩️ **Eisblume** macht als Supporter Platz und steht jetzt auf der Warteliste.',
      '🔄 **Thorgrimm** wechselt zu Schaden.',
    ])

    expect(runThreadLines(run({ participants: [p('1', 'tank')] }), run(), name)).toEqual(['➖ **Eisblume** hat sich abgemeldet.'])
  })

  it('Absage und neuer Termin', () => {
    expect(runThreadLines(run(), run({ status: 'cancelled', cancelReason: 'Zu wenig Anmeldungen' }), name))
      .toEqual(['❌ Die Gruppe wurde abgesagt: Zu wenig Anmeldungen'])
    expect(runThreadLines(run(), run({ startsAt: '2026-11-06T18:00:00.000Z' }), name)[0]).toMatch(/^🕒 Neuer Termin: <t:\d+:d>, <t:\d+:t> \(<t:\d+:R>\)$/)
  })
})

describe('guildEventAnnouncement', () => {
  const event: GuildEvent = {
    id: 'g1', title: 'Angelwettbewerb', description: 'Größter Fisch gewinnt', startsAt: '2026-11-13T18:00:00.000Z', endsAt: '2026-11-13T19:00:00.000Z',
    location: 'Loch Modan', status: 'scheduled', cancelReason: null, createdBy: '591736149647687697', createdAt: NOW.toISOString(), updatedAt: NOW.toISOString(),
  }
  it('mit Treffpunkt, Ende und Link zum Kalender', () => {
    const embed = embedOf(guildEventAnnouncement(event, SITE))
    expect(embed.title).toBe('Angelwettbewerb')
    expect(embed.url).toBe(`${SITE}/kalender?ansicht=liste`)
    const lines = embed.description!.split('\n')
    expect(lines[0]).toBe('Größter Fisch gewinnt')
    expect(lines[1]).toMatch(/^🗓️ <t:\d+:d>, <t:\d+:t>–<t:\d+:t> \(<t:\d+:R>\)$/)
    expect(lines.slice(2)).toEqual(['📍 Loch Modan', 'Eingetragen von <@591736149647687697>'])
  })
})

describe('Discord-Bot: Schreibzugriffe', () => {
  it('postet, bearbeitet, startet Threads und löscht (404 gilt als erledigt)', async () => {
    const calls: { url: string, method?: string, body?: string }[] = []
    const responses = [
      new Response(JSON.stringify({ id: '900000000000000001' }), { status: 200 }),
      new Response(JSON.stringify({ id: '900000000000000001' }), { status: 200 }),
      new Response(JSON.stringify({ id: '900000000000000001' }), { status: 201 }),
      new Response(null, { status: 204 }),
      new Response(JSON.stringify({ message: 'Unknown Channel' }), { status: 404 }),
    ]
    const fetch = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method, body: init?.body as string | undefined })
      return responses.shift()!
    })
    const bot = createDiscordBotClient('token', { fetch, sleep: async () => {} })
    const body = { content: 'Hallo', allowed_mentions: { parse: [] } as const }

    expect(await bot.createMessage('100', body)).toBe('900000000000000001')
    await bot.editMessage('100', '900000000000000001', body)
    await bot.startThread('100', '900000000000000001', 'x'.repeat(150))
    await bot.deleteMessage('100', '900000000000000001')
    await bot.deleteChannel('900000000000000001')

    expect(calls.map(call => `${call.method} ${call.url.replace('https://discord.com/api/v10', '')}`)).toEqual([
      'POST /channels/100/messages',
      'PATCH /channels/100/messages/900000000000000001',
      'POST /channels/100/messages/900000000000000001/threads',
      'DELETE /channels/100/messages/900000000000000001',
      'DELETE /channels/900000000000000001',
    ])
    expect(JSON.parse(calls[2]!.body!).name).toHaveLength(100)
  })
})
