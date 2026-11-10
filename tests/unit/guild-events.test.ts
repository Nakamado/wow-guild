import { describe, expect, it } from 'vitest'
import { mergeEvents } from '../../shared/domain/events'
import { checkGuildEventInput, guildEventToCalendar } from '../../shared/domain/guild-events'
import { can } from '../../shared/domain/permissions'
import type { GuildEvent, GuildEventInput } from '../../shared/types'

const NOW = new Date('2026-11-10T12:00:00.000Z')
const input = (overrides: Partial<GuildEventInput> = {}): GuildEventInput => ({
  title: 'Gildentreffen',
  description: '',
  startsAt: '2026-11-12T19:00:00.000Z',
  endsAt: null,
  location: null,
  ...overrides,
})
const event = (overrides: Partial<GuildEvent> = {}): GuildEvent => ({
  id: 'e-1',
  ...input(),
  status: 'scheduled',
  createdBy: '100001',
  createdAt: NOW.toISOString(),
  updatedAt: NOW.toISOString(),
  ...overrides,
})

describe('Gilden-Events', () => {
  it('prüft Beginn und Ende', () => {
    expect(checkGuildEventInput(input(), NOW).ok).toBe(true)
    expect(checkGuildEventInput(input({ startsAt: '2026-11-09T19:00:00.000Z' }), NOW)).toMatchObject({ ok: false, error: { code: 'starts-in-past' } })
    expect(checkGuildEventInput(input({ endsAt: '2026-11-12T18:00:00.000Z' }), NOW)).toMatchObject({ ok: false, error: { code: 'ends-before-start' } })
    expect(checkGuildEventInput(input({ endsAt: '2026-11-14T19:00:00.000Z' }), NOW)).toMatchObject({ ok: false, error: { code: 'too-long' } })
    // beim Bearbeiten darf ein vergangener, unveränderter Beginn bleiben
    const past = '2026-11-09T19:00:00.000Z'
    expect(checkGuildEventInput(input({ startsAt: past }), NOW, { startsAt: past }).ok).toBe(true)
  })

  it('erscheint im Kalender als Community-Termin mit Treffpunkt', () => {
    const merged = mergeEvents({
      discordEvents: [],
      runs: [],
      dungeons: [],
      guildEvents: [event({ location: 'Eisenschmiede' })],
      organizerNames: new Map([['100001', 'Nakamado']]),
    })
    expect(merged).toEqual([expect.objectContaining({
      id: 'guild:e-1', source: 'guild', type: 'community', guildEventId: 'e-1', location: 'Eisenschmiede', organizerName: 'Nakamado', status: 'scheduled',
    })])
    expect(guildEventToCalendar(event({ status: 'cancelled' })).status).toBe('cancelled')
  })

  it('eintragen dürfen Mitglieder, bearbeiten nur Ersteller und Admins', () => {
    const member = { level: 'member' as const, memberId: '100002' }
    expect(can(member, 'events:create')).toBe(true)
    expect(can({ level: 'user', memberId: '100003' }, 'events:create')).toBe(false)
    expect(can(member, 'events:edit', { organizerId: '100001' })).toBe(false)
    expect(can(member, 'events:edit', { organizerId: '100002' })).toBe(true)
    expect(can({ level: 'admin', memberId: '100009' }, 'events:edit', { organizerId: '100001' })).toBe(true)
  })
})
