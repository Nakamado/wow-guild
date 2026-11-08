import { describe, expect, it } from 'vitest'
import { manualMilestones } from '../../content/chronicle'
import { pointsRules } from '../../content/points'
import { exampleMilestones } from '../../data/demo/chronicle'
import { createDemoProgress } from '../../data/demo/progress'
import { createDemoCharacters } from '../../data/demo/characters'
import { detectMilestones, mergeMilestones, milestoneDate } from '../../shared/domain/chronicle'
import { buildLeaderboards, retroactiveEvents, scoreEvents, weekKey } from '../../shared/domain/points'
import { GuildMilestoneSchema, type GuildMilestone } from '../../shared/schemas/chronicle'
import { PointsRulesSchema, type ProgressEvent } from '../../shared/schemas/points'

const milestone = (overrides: Partial<GuildMilestone>): GuildMilestone => ({
  id: 'x', type: 'custom', title: 'X', category: 'custom', source: 'manual', occurredAt: '2026-11-10', ...overrides,
})

describe('Gilden-Chronik', () => {
  it('hat gültige, eindeutige manuelle und Beispiel-Einträge', () => {
    const all = [...manualMilestones, ...exampleMilestones]
    for (const entry of all) expect(() => GuildMilestoneSchema.parse(entry)).not.toThrow()
    expect(new Set(all.map(entry => entry.id)).size).toBe(all.length)
    expect(exampleMilestones.every(entry => entry.isDemo)).toBe(true)
  })

  it('sortiert neueste zuerst und nutzt ohne Ereignisdatum das Erkennungsdatum', () => {
    const merged = mergeMilestones([
      milestone({ id: 'alt', occurredAt: '2026-11-01' }),
      milestone({ id: 'neu', occurredAt: '2026-11-20' }),
      milestone({ id: 'erkannt', occurredAt: null, detectedAt: '2026-11-10T08:00:00.000Z', source: 'blizzard-api' }),
    ])
    expect(merged.map(entry => entry.id)).toEqual(['neu', 'erkannt', 'alt'])
    expect(milestoneDate(merged[1]!)).toBe('2026-11-10T08:00:00.000Z')
  })

  it('vermeidet Duplikate – manuelle Einträge haben Vorrang vor automatischen', () => {
    const automatic = milestone({ id: 'members-25', source: 'blizzard-api', dedupeKey: 'members.threshold:25', title: 'Automatisch', occurredAt: null, detectedAt: '2026-11-12' })
    const manual = milestone({ id: '2026-11-11-25-mitglieder', dedupeKey: 'members.threshold:25', title: 'Korrigiert' })
    const merged = mergeMilestones([automatic], [manual], [automatic])
    expect(merged).toHaveLength(1)
    expect(merged[0]!.title).toBe('Korrigiert')
  })

  it('erkennt Meilensteine nur einmal und ohne erfundenes Ereignisdatum', () => {
    const now = new Date('2026-11-20T10:00:00Z')
    const snapshot = { memberCount: 27, characters: [{ id: 'c1', level: 52, professionSkills: [300] }, { id: 'c2', level: 61, professionSkills: [] }] }
    const first = detectMilestones(snapshot, [], { now })
    expect(first.map(entry => entry.dedupeKey)).toEqual([
      'members.threshold:10', 'members.threshold:25', 'level.first:40', 'level.first:50', 'level.first:60', 'profession.first-max:300',
    ])
    expect(first.every(entry => entry.occurredAt === null && entry.detectedAt === now.toISOString())).toBe(true)
    expect(first.find(entry => entry.dedupeKey === 'level.first:40')!.characterIds).toEqual(['c1'])

    // erneute Abfrage, Mitgliederzahl gesunken: nichts Neues, nichts verschwindet
    expect(detectMilestones({ ...snapshot, memberCount: 8 }, first, { now })).toEqual([])
  })
})

describe('Punktesystem', () => {
  const rules = PointsRulesSchema.parse(pointsRules)
  const ev = (overrides: Partial<ProgressEvent>): ProgressEvent => ({ memberId: 'm1', characterId: 'c1', type: 'dungeon-boss', objectId: 'x', occurredAt: '2026-11-05T20:00:00.000Z', ...overrides })

  it('rechnet Stufen und Berufe rückwirkend (Stufe 23 = 22 × 100)', () => {
    const events = retroactiveEvents({ memberId: 'm1', characterId: 'c1', level: 23, professions: [{ id: 'mining', skill: 160 }] }, rules)
    expect(scoreEvents(events, rules)).toMatchObject({ oneTime: 2200 + 2 * 200, repeatable: 0 })
  })

  it('zählt dasselbe Ereignis aus zwei Quellen nur einmal', () => {
    const quest = ev({ type: 'dungeon-quest', objectId: '1234' })
    expect(scoreEvents([quest, { ...quest }], rules).total).toBe(rules.points['dungeon-quest'])
  })

  it('begrenzt wiederholbare Aktivität auf 300 Punkte pro Woche und Person', () => {
    const many = Array.from({ length: 20 }, (_, index) => ev({ type: 'raid-boss', objectId: `boss-${index}` })) // 20 × 20 = 400
    const score = scoreEvents(many, rules)
    expect(score).toMatchObject({ repeatable: 300, capped: 100 })
    // Neue Woche ab Mittwoch 04:00 UTC
    const nextWeek = ev({ type: 'raid-boss', objectId: 'boss-next', occurredAt: '2026-11-11T04:00:00.000Z' })
    expect(scoreEvents([...many, nextWeek], rules).repeatable).toBe(320)
    // Erstabschlüsse fallen nicht unter das Limit
    expect(scoreEvents([...many, ev({ type: 'raid-first', objectId: 'onyxia' })], rules).total).toBe(400)
  })

  it('bestimmt die Blizzard-Woche korrekt', () => {
    expect(weekKey('2026-11-11T03:59:00.000Z', rules.weekReset)).toBe('2026-11-04')
    expect(weekKey('2026-11-11T04:00:00.000Z', rules.weekReset)).toBe('2026-11-11')
    expect(weekKey('2026-11-15T12:00:00.000Z', rules.weekReset)).toBe('2026-11-11')
  })

  it('baut Main- und Gesamt-Rangliste mit Gleichstand', () => {
    const events = [
      ev({ memberId: 'a', characterId: 'a-main', type: 'level', objectId: '2' }),
      ev({ memberId: 'a', characterId: 'a-twink', type: 'level', objectId: '2' }),
      ev({ memberId: 'b', characterId: 'b-main', type: 'level', objectId: '2' }),
      ev({ memberId: 'c', characterId: 'c-main', type: 'level', objectId: '2' }),
    ]
    const members = [{ memberId: 'a', mainCharacterId: 'a-main' }, { memberId: 'b', mainCharacterId: 'b-main' }, { memberId: 'c', mainCharacterId: 'c-main' }]
    const { total, main } = buildLeaderboards(events, members, rules)
    expect(total.map(row => [row.memberId, row.rank, row.points])).toEqual([['a', 1, 200], ['b', 2, 100], ['c', 2, 100]])
    expect(main.map(row => row.rank)).toEqual([1, 1, 1])
  })

  it('erzeugt stabile Demo-Fortschritte', () => {
    const now = new Date('2026-11-06T12:00:00Z')
    const characters = createDemoCharacters(now)
    expect(createDemoProgress(characters, rules, now)).toEqual(createDemoProgress(characters, rules, now))
  })
})
