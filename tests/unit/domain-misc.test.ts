import { describe, expect, it } from 'vitest'
import { dungeons } from '../../shared/data/dungeons'
import { isValidRaceClass, validateCharacter } from '../../shared/domain/characters'
import { filterDungeons } from '../../shared/domain/dungeons'
import { mergeEvents } from '../../shared/domain/events'
import { computeGuildStats } from '../../shared/domain/guild'
import { accessLevelFromRoles, can, visitor, type Viewer } from '../../shared/domain/permissions'
import { formatDate, formatDateTime, formatTime } from '../../shared/utils/datetime'
import type { DiscordEvent } from '../../shared/types'
import { character, dungeon, member, NOW, run } from './fixtures'

describe('can – Berechtigungen', () => {
  const user: Viewer = { level: 'user', memberId: 'm-1' }
  const guildMember: Viewer = { level: 'member', memberId: 'm-1' }
  const admin: Viewer = { level: 'admin', memberId: 'm-admin' }

  it('Besucher und Nicht-Mitglieder dürfen nur lesen', () => {
    for (const viewer of [visitor, user]) {
      expect(can(viewer, 'members:view')).toBe(false)
      expect(can(viewer, 'runs:join')).toBe(false)
      expect(can(viewer, 'runs:create')).toBe(false)
    }
  })

  it('Gildenmitglieder dürfen Mitglieder sehen, Runs erstellen und beitreten', () => {
    expect(can(guildMember, 'members:view')).toBe(true)
    expect(can(guildMember, 'runs:create')).toBe(true)
    expect(can(guildMember, 'runs:join')).toBe(true)
  })

  it('nur Organisatoren bearbeiten oder sagen ihre eigenen Runs ab', () => {
    expect(can(guildMember, 'runs:edit', { organizerId: 'm-1' })).toBe(true)
    expect(can(guildMember, 'runs:cancel', { organizerId: 'm-2' })).toBe(false)
    expect(can(guildMember, 'runs:edit')).toBe(false)
  })

  it('Charaktere verwaltet nur der Besitzer', () => {
    expect(can(guildMember, 'characters:manage', { ownerId: 'm-1' })).toBe(true)
    expect(can(guildMember, 'characters:manage', { ownerId: 'm-2' })).toBe(false)
  })

  it('Admins dürfen moderieren', () => {
    expect(can(admin, 'runs:moderate')).toBe(true)
    expect(can(admin, 'runs:cancel', { organizerId: 'm-2' })).toBe(true)
    expect(can(guildMember, 'runs:moderate')).toBe(false)
  })

  it('leitet Zugriffsstufen aus Discord-Rollen ab', () => {
    const config = { memberRoleId: 'role-forever', adminRoleId: 'role-admin' }
    expect(accessLevelFromRoles(null, config)).toBe('user')
    expect(accessLevelFromRoles(['other'], config)).toBe('user')
    expect(accessLevelFromRoles(['role-forever'], config)).toBe('member')
    expect(accessLevelFromRoles(['role-forever', 'role-admin'], config)).toBe('admin')
    // Nicht konfigurierte Rollen-IDs dürfen niemals Zugriff gewähren
    expect(accessLevelFromRoles([''], { memberRoleId: '', adminRoleId: '' })).toBe('user')
  })
})

describe('mergeEvents', () => {
  const discordEvent = (id: string, startsAt: string): DiscordEvent => ({
    id, title: id, description: '', startsAt, endsAt: null, status: 'scheduled', organizerName: null, url: null,
  })

  it('führt beide Quellen sortiert und mit stabilen IDs zusammen', () => {
    const events = mergeEvents({
      discordEvents: [discordEvent('e-2', '2026-11-07T18:00:00Z')],
      runs: [run({ id: 'r-1', startsAt: '2026-11-06T18:00:00Z' })],
      dungeons: [dungeon],
    })
    expect(events.map(event => event.id)).toEqual(['site:r-1', 'discord:e-2'])
    expect(events[0]).toMatchObject({ type: 'dungeon', title: 'Testgewölbe', openSlots: 5 })
  })

  it('blendet per Bot angekündigte Duplikate aus (Webseite bleibt führend)', () => {
    const events = mergeEvents({
      discordEvents: [discordEvent('e-1', '2026-11-06T18:00:00Z')],
      runs: [run({ id: 'r-1', discordEventId: 'e-1' })],
      dungeons: [dungeon],
    })
    expect(events.map(event => event.id)).toEqual(['site:r-1'])
  })

  it('übernimmt abgesagte Runs als abgesagte Events', () => {
    const [event] = mergeEvents({ discordEvents: [], runs: [run({ status: 'cancelled' })], dungeons: [dungeon] })
    expect(event?.status).toBe('cancelled')
  })
})

describe('Charaktere', () => {
  it('kennt die neuen Forever-Kombinationen', () => {
    expect(isValidRaceClass('dwarf', 'shaman', 'alliance')).toBe(true)
    expect(isValidRaceClass('undead', 'paladin', 'horde')).toBe(true)
    expect(isValidRaceClass('skyborne', 'mage', 'alliance')).toBe(true)
    expect(isValidRaceClass('skyborne', 'mage', 'horde')).toBe(false)
    expect(isValidRaceClass('night-elf', 'mage', 'alliance')).toBe(false)
    expect(isValidRaceClass('human', 'warrior', 'horde')).toBe(false)
  })

  it('erkennt ungültige Charaktere mit verständlicher Meldung', () => {
    const result = validateCharacter(character('c', 'm', { raceId: 'gnome', classId: 'druid', roles: ['healer'] }))
    expect(result).toMatchObject({ ok: false, error: { code: 'invalid-race-class' } })
    expect(validateCharacter(character('c', 'm', { roles: ['healer'] }))).toMatchObject({ ok: false, error: { code: 'invalid-roles' } })
  })
})

describe('filterDungeons', () => {
  it('sucht unabhängig von Groß-/Kleinschreibung und Akzenten in DE/EN-Namen und Kürzeln', () => {
    expect(filterDungeons(dungeons, { query: 'todesminen' }).map(d => d.slug)).toEqual(['the-deadmines'])
    expect(filterDungeons(dungeons, { query: 'zul farrak' })).toHaveLength(0)
    expect(filterDungeons(dungeons, { query: 'ZF' }).map(d => d.slug)).toContain('zulfarrak')
    expect(filterDungeons(dungeons, { query: 'dusterbruch' })).toHaveLength(3)
  })

  it('filtert nach Levelbereich, passendem Charakter und geplanten Gruppen', () => {
    const atLevel = filterDungeons(dungeons, { level: 60 })
    expect(atLevel.every(d => d.levelRange.max === 60)).toBe(true)

    const forCharacter = filterDungeons(dungeons, { characterLevel: 16 })
    expect(forCharacter.map(d => d.slug)).toEqual(expect.arrayContaining(['the-deadmines', 'ragefire-chasm']))

    const withRuns = filterDungeons(dungeons, { onlyWithRuns: true }, {
      runs: [run({ dungeonSlug: 'uldaman' }), run({ dungeonSlug: 'maraudon', status: 'cancelled' })],
      now: NOW,
    })
    expect(withRuns.map(d => d.slug)).toEqual(['uldaman'])
  })
})

describe('computeGuildStats', () => {
  it('zählt nur Gildenmitglieder und deren Charaktere', () => {
    const stats = computeGuildStats(
      [member('a'), member('b', { isGuildMember: false })],
      [character('c1', 'a', { level: 60 }), character('c2', 'a', { level: 30, classId: 'mage', raceId: 'gnome', roles: ['dps'] }), character('c3', 'b')],
      [run(), run({ id: 'r-2', status: 'cancelled' })],
      NOW,
    )
    expect(stats).toEqual({
      memberCount: 1,
      characterCount: 2,
      classDistribution: { warrior: 1, mage: 1 },
      averageLevel: 45,
      maxLevelCount: 1,
      upcomingRunCount: 1,
    })
  })
})

describe('Zeitdarstellung (Europe/Berlin)', () => {
  it('rechnet UTC korrekt in Winter- und Sommerzeit um', () => {
    expect(formatTime('2026-11-04T18:00:00Z')).toBe('19:00') // MEZ
    expect(formatTime('2026-07-01T18:00:00Z')).toBe('20:00') // MESZ
    expect(formatDate('2026-12-31T23:30:00Z')).toBe('01.01.2027') // Datumswechsel
    expect(formatDateTime('2026-11-04T18:00:00Z')).toMatch(/04\.11\.2026.*19:00/)
  })
})
