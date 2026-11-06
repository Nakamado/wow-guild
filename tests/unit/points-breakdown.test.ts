import { describe, expect, it } from 'vitest'
import { pointsRules } from '../../content/points'
import { explainScore, retroactiveEvents, scoreEvents } from '../../shared/domain/points'
import type { ProgressEvent } from '../../shared/schemas/points'
import { characterSlug, parseCharacterProgress, parsePreviewCharacters, parseProfessions } from '../../server/providers/blizzard/progress'

const base = { memberId: 'm1', characterId: 'c1' }

describe('Aufschlüsselung der Punkte', () => {
  it('fasst Stufen als Spanne und gleiche Posten zusammen', () => {
    const events: ProgressEvent[] = [
      ...retroactiveEvents({ ...base, level: 19, professions: [{ id: '186', skill: 160 }] }, pointsRules),
      { ...base, type: 'dungeon-complete', objectId: 'the-deadmines:1', occurredAt: '2026-11-05T18:00:00Z' },
      { ...base, type: 'dungeon-complete', objectId: 'the-deadmines:2', occurredAt: '2026-11-05T20:00:00Z' },
    ]
    const score = scoreEvents(events, pointsRules)
    const lines = explainScore(score, event => (event.type === 'profession-milestone' ? `Bergbau – Skill ${event.objectId.split(':')[1]}` : 'Die Todesminen'))

    const level = lines.find(line => line.type === 'level')!
    expect(level).toMatchObject({ count: 18, points: 1800, items: [{ label: 'Stufe 2 bis 19', count: 18, points: 1800 }] })
    const professions = lines.find(line => line.type === 'profession-milestone')!
    expect(professions.items.map(item => item.label)).toEqual(['Bergbau – Skill 75', 'Bergbau – Skill 150'])
    const runs = lines.find(line => line.type === 'dungeon-complete')!
    expect(runs.items).toEqual([{ label: 'Die Todesminen', count: 2, points: 20 }])
    // Summe der Zeilen = Gesamtpunkte
    expect(lines.reduce((sum, line) => sum + line.points, 0)).toBe(score.total)
    // nach Punkten absteigend
    expect(lines[0]!.type).toBe('level')
  })

  it('weist Punkte über dem Wochenlimit aus', () => {
    const events: ProgressEvent[] = Array.from({ length: 20 }, (_, index) => ({
      ...base, type: 'raid-boss' as const, objectId: `raid:${index}`, occurredAt: '2026-11-05T20:00:00Z',
    }))
    const line = explainScore(scoreEvents(events, pointsRules), () => 'Raid')[0]!
    expect(line).toMatchObject({ count: 20, points: 300, capped: 100 })
  })
})

describe('Blizzard-Fortschritt lesen', () => {
  it('bildet den realmlosen Slug', () => {
    expect(characterSlug('  Nak   Totembart ')).toBe('nak-totembart')
  })

  it('liest die Testcharaktere mit optionaler Discord-ID', () => {
    expect(parsePreviewCharacters(' Nak Totembart = 591736149647687697 , Zweiter Char,, Dritter=abc')).toEqual([
      { name: 'Nak Totembart', discordId: '591736149647687697' },
      { name: 'Zweiter Char', discordId: null },
      { name: 'Dritter', discordId: null },
    ])
  })

  it('liest Berufe mit und ohne Stufen', () => {
    expect(parseProfessions({
      primaries: [
        { profession: { id: 186, name: 'Bergbau' }, tiers: [{ skill_points: 160, max_skill_points: 225 }] },
        { profession: { id: 182, name: 'Kräuterkunde' }, skill_points: 80 },
      ],
      secondaries: [{ profession: { name: 'Angeln' }, skill_points: 20 }],
    })).toEqual([
      { id: '186', name: 'Bergbau', skill: 160 },
      { id: '182', name: 'Kräuterkunde', skill: 80 },
      { id: 'angeln', name: 'Angeln', skill: 20 },
    ])
    expect(parseProfessions(null)).toEqual([])
  })

  it('liest Profil, Klasse und letzten Login', () => {
    const progress = parseCharacterProgress('nak-totembart', 'Nak Totembart', {
      id: 6815512, name: 'Nak', surname: 'Totembart', level: 19, character_class: { id: 7 }, last_login_timestamp: 1793892901000,
    }, null)
    expect(progress).toEqual({
      characterId: 'bnet-6815512',
      slug: 'nak-totembart',
      name: 'Nak Totembart',
      level: 19,
      classId: 'shaman',
      professions: [],
      lastLoginAt: new Date(1793892901000).toISOString(),
    })
    expect(parseCharacterProgress('x-y', 'X Y', { name: 'X' }, null)).toBeNull()
  })
})
