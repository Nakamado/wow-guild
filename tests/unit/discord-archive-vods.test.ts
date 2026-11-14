import { describe, expect, it } from 'vitest'
import type { DiscordEvent, Vod } from '#shared/types'
import { attachVods, withArchivedEvents } from '#shared/domain/events'
import { helixVideoToVod, parseTwitchDuration } from '../../server/providers/twitch'

const NOW = new Date('2026-11-14T12:00:00Z')
const event = (id: string, startsAt: string, extra: Partial<DiscordEvent> = {}): DiscordEvent => ({
  id, title: `Event ${id}`, description: '', startsAt, endsAt: null, status: 'scheduled', organizerName: null, url: `https://discord.com/events/1/${id}`, ...extra,
})
const vod = (id: string, startedAt: string, hours: number): Vod => ({ id, url: `https://www.twitch.tv/videos/${id}`, title: id, startedAt, durationSeconds: hours * 3600 })

describe('withArchivedEvents', () => {
  it('ergänzt vergangene archivierte Events als abgeschlossen, ohne Discord-Link', () => {
    const live = [event('1', '2026-11-20T18:00:00Z')]
    const archived = [
      event('1', '2026-11-20T18:00:00Z'),
      event('2', '2026-11-10T18:00:00Z', { status: 'active' }),
      event('3', '2026-11-09T18:00:00Z', { status: 'cancelled' }),
      // vor Beginn verschwunden = gelöscht
      event('4', '2026-11-18T18:00:00Z'),
    ]
    const result = withArchivedEvents(live, archived, NOW)
    expect(result.map(entry => `${entry.id}:${entry.status}:${entry.url ? 'link' : '-'}`)).toEqual(['1:scheduled:link', '2:completed:-', '3:cancelled:-'])
  })
})

describe('attachVods', () => {
  it('verknüpft das VOD mit der größten Überschneidung, nur bei vergangenen, nicht abgesagten Events', () => {
    const events = [
      event('stream', '2026-11-10T18:00:00Z', { endsAt: '2026-11-10T21:00:00Z' }),
      event('early', '2026-11-11T19:00:00Z'),
      event('none', '2026-11-12T18:00:00Z'),
      event('cancelled', '2026-11-10T18:00:00Z', { status: 'cancelled' }),
      event('future', '2026-11-20T18:00:00Z'),
    ]
    const vods = [
      vod('kurz', '2026-11-10T16:30:00Z', 2),
      vod('lang', '2026-11-10T17:55:00Z', 3.5),
      // startet 45 Min. vor dem Event
      vod('frueh', '2026-11-11T18:15:00Z', 3),
      vod('zukunft', '2026-11-20T18:00:00Z', 2),
    ]
    const byId = Object.fromEntries(attachVods(events, vods, NOW).map(entry => [entry.id, entry.vodUrl ?? null]))
    expect(byId).toEqual({
      stream: 'https://www.twitch.tv/videos/lang',
      early: 'https://www.twitch.tv/videos/frueh',
      none: null,
      cancelled: null,
      future: null,
    })
  })
})

describe('Twitch-VODs', () => {
  it('Dauer und Umwandlung', () => {
    expect(parseTwitchDuration('3h2m10s')).toBe(10930)
    expect(parseTwitchDuration('45m')).toBe(2700)
    expect(parseTwitchDuration('kaputt')).toBe(0)
    expect(helixVideoToVod({ id: '1', url: 'https://www.twitch.tv/videos/1', title: 'Raid', created_at: '2026-11-10T18:00:00Z', duration: '1h0m0s', type: 'archive' }))
      .toEqual({ id: '1', url: 'https://www.twitch.tv/videos/1', title: 'Raid', startedAt: '2026-11-10T18:00:00.000Z', durationSeconds: 3600 })
  })
})

describe('Absage auf der Webseite', () => {
  it('überschreibt den Discord-Status – auch für kommende Events – mit Grund', () => {
    const live = [event('5', '2026-11-20T18:00:00Z')]
    const archived = [
      event('5', '2026-11-20T18:00:00Z', { siteCancelled: true, cancelReason: 'Stream fällt aus' }),
      event('6', '2026-11-10T18:00:00Z', { siteCancelled: true, cancelReason: null }),
    ]
    const result = withArchivedEvents(live, archived, NOW)
    expect(result.map(entry => [entry.id, entry.status, entry.cancelReason])).toEqual([['5', 'cancelled', 'Stream fällt aus'], ['6', 'cancelled', null]])
    // abgesagte bekommen kein VOD
    expect(attachVods(result, [vod('v', '2026-11-10T18:00:00Z', 2)], NOW)[1]!.vodUrl).toBeUndefined()
  })
})
