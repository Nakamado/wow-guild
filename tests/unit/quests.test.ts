import { describe, expect, it } from 'vitest'
import { dungeonQuestGroups, dungeonQuestTitles } from '../../shared/data/dungeon-quests'
import { questEvents, questProgress, type QuestGroup, type QuestInfo } from '../../shared/domain/quests'
import { parseCompletedQuests, parseQuestArea, parseQuestInfo } from '../../server/providers/blizzard/quests'

const quest = (id: number, extra: Partial<QuestInfo> = {}): QuestInfo => ({ id, title: `Quest ${id}`, typeId: null, areaId: null, faction: null, restricted: false, ...extra })

// Antworten wie von der Blizzard-API für WoW: Forever (gekürzt)
const deadminesArea = { id: 1581, area: 'Die Todesminen', quests: [166, 167, 168, 214, 2040, 92753].map(id => ({ id, name: '…' })) }
const quest166 = {
  id: 166,
  title: 'Die Bruderschaft der Defias',
  type: { name: 'Dungeon', id: 81 },
  area: { name: 'Die Todesminen', id: 1581 },
  requirements: {},
}
const quest98423 = {
  id: 98423,
  title: 'Das Abkommen des Einvernehmens',
  area: { name: 'Dun Morogh', id: 1 },
  requirements: { faction: { type: 'ALLIANCE', name: 'Allianz' } },
}

describe('Blizzard-Questdaten lesen', () => {
  it('liest abgeschlossene Quests und den Static-Namespace', () => {
    const parsed = parseCompletedQuests({
      quests: [
        { key: { href: 'https://eu.api.blizzard.com/data/wow/quest/166?namespace=static-1.60.1_70399-forever-eu' }, name: 'The Defias Brotherhood', id: 166 },
        { id: 166 },
        { id: 'x' },
      ],
    })
    expect(parsed).toEqual({ ids: [166], staticNamespace: 'static-1.60.1_70399-forever-eu' })
    expect(parseCompletedQuests({ _links: {} })).toBeNull()
  })

  it('liest Art, Gebiet, Fraktion und Beschränkungen einer Quest', () => {
    expect(parseQuestInfo(quest166)).toEqual({ id: 166, title: 'Die Bruderschaft der Defias', typeId: 81, areaId: 1581, faction: null, restricted: false })
    expect(parseQuestInfo(quest98423)).toMatchObject({ id: 98423, typeId: null, areaId: 1, faction: 'alliance', restricted: false })
    expect(parseQuestInfo({ id: 1516, title: 'Ruf der Erde', requirements: { classes: [{ id: 7, name: 'Schamane' }] } })).toMatchObject({ restricted: true })
  })

  it('liest die Quest-Liste eines Dungeon-Gebiets', () => {
    expect(parseQuestArea(deadminesArea)).toEqual({ name: 'Die Todesminen', questIds: [166, 167, 168, 214, 2040, 92753] })
  })
})

describe('Dungeon-Quest-Liste (aus dem Dungeon Journal)', () => {
  const group = (id: string) => dungeonQuestGroups.find(entry => entry.id === id)!

  it('hat dieselben Allianz-Zahlen wie das Journal', () => {
    const expected: Record<string, number> = {
      'hall-of-thanes': 5, 'ruins-of-lordaeron': 4, 'wailing-caverns': 5, 'the-deadmines': 7, 'blackfathom-deeps': 5,
      'the-stockade': 6, 'excavation-site-wetlands': 7, 'city-of-dalaran': 4, 'gnomeregan': 9, 'razorfen-kraul': 4,
      'scarlet-monastery-library': 2, 'scarlet-monastery-armory': 1, 'scarlet-monastery-cathedral': 1, 'uldaman': 9,
      'krol-dok-stronghold': 4, 'maraudon': 8, 'temple-of-atal-hakkar': 7, 'lower-blackrock-spire': 9, 'dire-maul-east': 3,
      'dire-maul-west': 4, 'dire-maul-north': 5, 'stratholme-undead': 6, 'scholomance': 4,
    }
    for (const [id, count] of Object.entries(expected)) expect(group(id).quests.alliance, id).toHaveLength(count)
  })

  it('lässt Berufsquests weg', () => {
    const all = dungeonQuestGroups.flatMap(entry => [...entry.quests.alliance, ...entry.quests.horde].flat())
    expect(all).not.toContain(4083) // Der spektrale Kelch
    expect(all).not.toContain(5127) // Die Dämonenschmiede
  })

  it('jede Gruppe gehört zu einem Dungeon und jede Quest hat einen Titel', () => {
    for (const entry of dungeonQuestGroups) {
      expect(entry.dungeonSlugs.length).toBeGreaterThan(0)
      for (const slot of [...entry.quests.alliance, ...entry.quests.horde].flat()) {
        if (typeof slot === 'number') expect(dungeonQuestTitles[slot], `${entry.id}: ${slot}`).toBeTruthy()
      }
    }
  })
})

describe('Quest-Fortschritt', () => {
  const deadmines = dungeonQuestGroups.find(group => group.id === 'the-deadmines')!
  const hall = dungeonQuestGroups.find(group => group.id === 'hall-of-thanes')!
  const catalog = new Map<number, QuestInfo>([
    [166, quest(166, { typeId: 81 })],
    [2040, quest(2040, { typeId: 81, faction: 'alliance' })],
    [168, quest(168, { typeId: 81, faction: 'alliance' })],
    [167, quest(167, { typeId: 81 })],
    [214, quest(214, { typeId: 81 })],
    [12, quest(12, { typeId: 1 })], // Gruppenquest
    [1516, quest(1516, { restricted: true, typeId: 81 })], // Klassenquest
    [96395, quest(96395, { typeId: 81 })],
    [65, quest(65)], // Vorquest der Defias-Kette – normale Quest
  ])
  const groups = [deadmines, hall]

  it('Nak Totembart: Todesminen 6/7 mit fehlender Quest, Halle der Thane vollständig', () => {
    const completed = [65, 166, 167, 168, 214, 2040, 373, 12, 1516, 96403, 96394, 96393, 96395, 98423]
    const progress = questProgress({ completed, faction: 'alliance', catalog, groups })
    expect(progress.dungeons).toEqual([
      // Titel kommt aus dem Journal, solange die API die Quest nicht geliefert hat
      { groupId: 'the-deadmines', name: 'Die Todesminen', done: 6, total: 7, complete: false, missing: ['Zerstörung in den Todesminen'] },
      { groupId: 'hall-of-thanes', name: 'Halle der Thane', done: 5, total: 5, complete: true, missing: [] },
    ])
    // Dungeon-Quests: alle aus den Gruppen; Vorquest 65 und Klassenquest 1516 zählen nicht
    expect(progress.dungeonQuests).toEqual([166, 167, 168, 214, 373, 2040, 96393, 96394, 96395, 96403, 98423])
    expect(progress.unassignedDungeonQuests).toEqual([])
    expect(progress.groupQuests).toEqual([12])
  })

  it('zählt für die Horde nur Horde-taugliche Quests', () => {
    const progress = questProgress({ completed: [96403, 96395], faction: 'horde', catalog, groups })
    expect(progress.dungeons.find(entry => entry.groupId === 'hall-of-thanes')).toMatchObject({ done: 2, total: 2, complete: true })
    // Die Todesminen haben keine Horde-Quests
    expect(progress.dungeons.find(entry => entry.groupId === 'the-deadmines')).toBeUndefined()
  })

  it('wertet gleichnamige Quests mit verschiedenen IDs nur einmal', () => {
    const withTwins = new Map(catalog)
    withTwins.set(95189, quest(95189, { title: 'Wappen von Lordaeron', typeId: 81 }))
    withTwins.set(95204, quest(95204, { title: 'Wappen von Lordaeron', typeId: 81 }))
    const progress = questProgress({ completed: [95204, 95189], faction: 'alliance', catalog: withTwins, groups })
    expect(progress.dungeonQuests).toEqual([95189])
  })

  it('Ruinen von Lordaeron: eine der beiden Wappen-IDs genügt', () => {
    const ruins = dungeonQuestGroups.find(group => group.id === 'ruins-of-lordaeron')!
    const progress = questProgress({ completed: [95250, 95195, 92415, 95204], faction: 'alliance', catalog, groups: [ruins] })
    expect(progress.dungeons).toEqual([{ groupId: 'ruins-of-lordaeron', name: 'Ruinen von Lordaeron', done: 4, total: 4, complete: true, missing: [] }])
    expect(progress.dungeonQuests).toEqual([92415, 95195, 95204, 95250])
  })

  it('erkennt Quests ohne bekannte ID am Titel', () => {
    const titledGroup: QuestGroup = { id: 'test', name: 'Testdungeon', quests: { alliance: ['Eine grüne Probe', 'Das Herz der Störung', 'Überwältigende Macht'], horde: [] } }
    const titled = new Map(catalog)
    titled.set(99001, quest(99001, { title: 'Eine grüne  Probe' }))
    titled.set(99002, quest(99002, { title: 'Das Herz der Störung' }))
    titled.set(99003, quest(99003, { title: 'Etwas anderes' }))
    const progress = questProgress({ completed: [99001, 99002, 99003], faction: 'alliance', catalog: titled, groups: [titledGroup] })
    expect(progress.dungeons).toEqual([{ groupId: 'test', name: 'Testdungeon', done: 2, total: 3, complete: false, missing: ['Überwältigende Macht'] }])
    expect(progress.dungeonQuests).toEqual([99001, 99002])
  })

  it('macht daraus einmalige Punkte-Ereignisse je Charakter', () => {
    const progress = questProgress({ completed: [96403, 96394, 96393, 96395, 98423, 12], faction: 'alliance', catalog, groups })
    const events = questEvents({ memberId: 'm', characterId: 'c' }, progress)
    expect(events.filter(event => event.type === 'dungeon-quest')).toHaveLength(5)
    expect(events.filter(event => event.type === 'group-quest').map(event => event.objectId)).toEqual(['quest:12'])
    expect(events.filter(event => event.type === 'dungeon-first').map(event => event.objectId)).toEqual(['group:hall-of-thanes'])
    expect(events.every(event => event.occurredAt === null)).toBe(true)
  })
})

describe('Quest-Anzahl je Dungeon', () => {
  it('zählt die Quests der Fraktion, 0 ohne Quests', async () => {
    const { dungeonQuestCount } = await import('../../shared/domain/quests')
    expect(dungeonQuestCount('the-stockade', 'alliance')).toBe(6)
    expect(dungeonQuestCount('the-stockade', 'horde')).toBe(0)
    expect(dungeonQuestCount('ragefire-chasm', 'horde')).toBe(6)
    expect(dungeonQuestCount('gibt-es-nicht', 'alliance')).toBe(0)
  })
})
