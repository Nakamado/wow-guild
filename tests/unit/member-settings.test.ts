import { describe, expect, it } from 'vitest'
import { normalizeTwitchLogin, TwitchLoginSchema } from '../../shared/schemas/member-settings'
import { detectMilestones } from '../../shared/domain/chronicle'

describe('Twitch-Kanal in den Einstellungen', () => {
  it('akzeptiert Links, @-Namen und Kanalnamen', () => {
    expect(normalizeTwitchLogin('https://www.twitch.tv/Miinyu')).toBe('miinyu')
    expect(normalizeTwitchLogin('twitch.tv/mein_kanal?ref=x')).toBe('mein_kanal')
    expect(normalizeTwitchLogin('@Kanal123')).toBe('kanal123')
    expect(normalizeTwitchLogin('  ')).toBeNull()
    expect(normalizeTwitchLogin(null)).toBeNull()
  })

  it('lehnt ungültige Kanalnamen ab', () => {
    expect(TwitchLoginSchema.safeParse('ab').success).toBe(false)
    expect(TwitchLoginSchema.safeParse('mit leerzeichen').success).toBe(false)
    expect(TwitchLoginSchema.safeParse('youtube.com/x').success).toBe(false)
    expect(TwitchLoginSchema.parse('Gut_Kanal1')).toBe('gut_kanal1')
  })
})

describe('Automatische Chronik-Meilensteine', () => {
  it('nennt den ersten Charakter auf einer Stufe beim Namen', () => {
    const found = detectMilestones({
      memberCount: 12,
      characters: [{ id: 'minyu-souleater', name: 'Minyu Souleater', level: 41, professionSkills: [] }],
    }, [], { now: new Date('2026-11-20T18:00:00Z') })
    expect(found.map(entry => entry.dedupeKey)).toEqual(['members.threshold:10', 'level.first:40'])
    expect(found[1]).toMatchObject({ description: 'Geschafft hat es Minyu Souleater.', occurredAt: null, detectedAt: '2026-11-20T18:00:00.000Z' })
  })
})
