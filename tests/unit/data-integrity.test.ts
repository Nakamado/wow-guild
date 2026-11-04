import { describe, expect, it } from 'vitest'
import { createDemoDataset } from '../../data/demo'
import { gameClasses } from '../../shared/data/classes'
import { dungeons, findDungeon, instances } from '../../shared/data/dungeons'
import { raids } from '../../shared/data/raids'
import { races } from '../../shared/data/races'
import { dataSources } from '../../shared/data/sources'
import { validateCharacter } from '../../shared/domain/characters'
import { canJoinRun } from '../../shared/domain/runs'
import { computeComposition } from '../../shared/domain/composition'
import {
  CharacterSchema,
  ClipSchema,
  CommunityMemberSchema,
  DiscordEventSchema,
  DungeonSchema,
  GameClassSchema,
  GroupRunSchema,
  RaceSchema,
  SourceRefSchema,
  StreamerSchema,
  StreamStatusSchema,
} from '../../shared/schemas'
import type { GroupRun } from '../../shared/types'

const sourceIds = new Set(dataSources.map(source => source.id))
const classIds = new Set(gameClasses.map(gameClass => gameClass.id))
const unique = (values: string[]) => new Set(values).size === values.length

describe('statische Spieldaten', () => {
  it('sind schema-valide und haben eindeutige IDs', () => {
    for (const source of dataSources) SourceRefSchema.parse(source)
    for (const gameClass of gameClasses) GameClassSchema.parse(gameClass)
    for (const race of races) RaceSchema.parse(race)
    for (const dungeon of instances) DungeonSchema.parse(dungeon)

    expect(unique(gameClasses.map(c => c.id))).toBe(true)
    expect(unique(races.map(r => r.id))).toBe(true)
    expect(unique(instances.map(d => d.slug))).toBe(true)
  })

  it('verweisen nur auf existierende Quellen', () => {
    const referenced = [...gameClasses, ...races, ...instances].flatMap(entry => entry.sourceIds)
    expect(referenced.filter(id => !sourceIds.has(id))).toEqual([])
  })

  it('Völker verweisen nur auf existierende Klassen; jede Klasse ist spielbar', () => {
    const playable = new Set<string>()
    for (const race of races) {
      for (const list of Object.values(race.classesByFaction)) {
        for (const classId of list ?? []) {
          expect(classIds.has(classId), `${race.id} → ${classId}`).toBe(true)
          playable.add(classId)
        }
      }
    }
    expect([...classIds].filter(id => !playable.has(id))).toEqual([])
  })

  it('Dungeons haben plausible Stufen', () => {
    for (const dungeon of dungeons) {
      if (dungeon.minLevel !== null) expect(dungeon.minLevel, dungeon.slug).toBeLessThanOrEqual(dungeon.levelRange.min)
    }
    // Alle 9 neuen Forever-Dungeons sind erfasst
    expect(dungeons.filter(d => d.isNewInForever)).toHaveLength(9)
  })

  it('Raids sind Stufe-60-Instanzen mit offiziellen Raidgrößen', () => {
    expect(raids.map(raid => [raid.slug, raid.groupSize])).toEqual([
      ['the-barrow-deeps', 10],
      ['hyjal-summit', 20],
      ['onyxias-lair', 40],
    ])
    expect(raids.every(raid => raid.kind === 'raid' && raid.minLevel === 60)).toBe(true)
    expect(dungeons.every(dungeon => dungeon.kind === 'dungeon')).toBe(true)
  })
})

describe('Demo-Datensatz', () => {
  const now = new Date('2026-11-04T12:00:00Z')
  const data = createDemoDataset(now)

  it('ist vollständig schema-valide', () => {
    for (const entry of data.members) CommunityMemberSchema.parse(entry)
    for (const entry of data.characters) CharacterSchema.parse(entry)
    for (const entry of data.runs) GroupRunSchema.parse(entry)
    for (const entry of data.discordEvents) DiscordEventSchema.parse(entry)
    for (const entry of data.clips) ClipSchema.parse(entry)
    for (const entry of data.streamers) StreamerSchema.parse(entry)
    StreamStatusSchema.parse(data.streamStatus)
  })

  it('ist klar als Demo gekennzeichnet', () => {
    expect(data.members.every(m => m.source === 'demo')).toBe(true)
    expect(data.characters.every(c => c.source === 'demo')).toBe(true)
    expect(data.clips.every(c => c.title.startsWith('Demo-Clip'))).toBe(true)
    expect(data.streamStatus.isLive).toBe(false)
  })

  it('hat eindeutige IDs und gültige Referenzen', () => {
    const memberIds = new Set(data.members.map(m => m.id))
    expect(unique(data.members.map(m => m.id))).toBe(true)
    expect(unique(data.characters.map(c => c.id))).toBe(true)
    expect(unique(data.runs.map(r => r.id))).toBe(true)
    for (const character of data.characters) expect(memberIds.has(character.memberId)).toBe(true)
    for (const streamer of data.streamers) if (streamer.memberId) expect(memberIds.has(streamer.memberId)).toBe(true)
  })

  it('enthält nur spielbare Charaktere mit genau einem Hauptcharakter je Mitglied', () => {
    for (const character of data.characters) {
      expect(validateCharacter(character).ok, character.name).toBe(true)
    }
    const mains = new Map<string, number>()
    for (const character of data.characters) {
      if (character.isMain) mains.set(character.memberId, (mains.get(character.memberId) ?? 0) + 1)
    }
    expect([...mains.values()].every(count => count === 1)).toBe(true)
  })

  it('Runs halten alle Geschäftsregeln ein (wie per Anmeldung entstanden)', () => {
    for (const original of data.runs) {
      const dungeon = findDungeon(original.dungeonSlug)
      expect(dungeon, original.dungeonSlug).toBeDefined()
      if (!dungeon) continue

      // Run Schritt für Schritt neu aufbauen – jede Anmeldung muss erlaubt sein
      let rebuilt: GroupRun = { ...original, status: 'open', participants: [], waitlist: [] }
      const joinTime = new Date(Math.min(now.getTime(), Date.parse(original.startsAt) - 3_600_000))
      for (const participant of original.participants) {
        const member = data.members.find(m => m.id === participant.memberId)!
        const character = data.characters.find(c => c.id === participant.characterId)!
        const check = canJoinRun({ run: rebuilt, dungeon, member, character, role: participant.role, now: joinTime })
        expect(check.ok, `${original.id}: ${character.name} als ${participant.role}`).toBe(true)
        rebuilt = { ...rebuilt, participants: [...rebuilt.participants, participant] }
      }
      expect(computeComposition(original).filled).toBe(original.participants.length)
    }
  })

  it('plant Demo-Raids nie vor der Raid-Öffnung', () => {
    const raidRuns = data.runs.filter(r => findDungeon(r.dungeonSlug)?.kind === 'raid')
    expect(raidRuns.length).toBeGreaterThan(0)
    expect(raidRuns.every(r => Date.parse(r.startsAt) >= Date.parse('2026-12-09T00:00:00Z'))).toBe(true)
  })

  it('erzeugt Termine relativ zum aktuellen Datum', () => {
    const upcoming = data.runs.filter(r => r.status === 'open')
    expect(upcoming.every(r => Date.parse(r.startsAt) > now.getTime())).toBe(true)
  })
})
