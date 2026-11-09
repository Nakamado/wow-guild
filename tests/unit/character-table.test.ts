import { describe, expect, it } from 'vitest'
import { findProfession } from '../../shared/data/professions'
import { defaultCharacterSort, groupCharacterRows, nextSort, primaryProfessions, secondaryProfessions, sortCharacterRows, type CharacterTableRow } from '../../shared/domain/character-table'
import type { Character, Profession } from '../../shared/types'

const prof = (id: string, skill: number): Profession => {
  const info = findProfession(id)!
  return { id, name: info.name, kind: info.kind, skill, maxSkill: 300, source: 'demo' }
}

function row(name: string, overrides: Partial<Character> = {}, playerName = 'Spieler'): CharacterTableRow {
  return {
    playerName,
    character: {
      id: name, memberId: 'm', name, realm: 'PvE', faction: 'alliance', classId: 'warrior', raceId: 'human',
      level: 10, roles: ['dps'], isMain: false, source: 'demo', updatedAt: '2026-11-06T00:00:00.000Z', professions: [],
      ...overrides,
    },
  }
}

const names = (rows: CharacterTableRow[]) => rows.map(entry => entry.character.name)

const rows = [
  row('Bruno Bart', { level: 30, classId: 'mage', raceId: 'gnome', professions: [prof('tailoring', 225), prof('enchanting', 180)] }),
  row('Anna Amsel', { level: 60, classId: 'priest', raceId: 'dwarf', professions: [prof('mining', 300), prof('cooking', 300)] }),
  row('Carla Cello', { level: 12, classId: 'druid', raceId: 'night-elf' }),
  row('Dora Dachs', { level: 30, classId: 'hunter', raceId: 'human', professions: [prof('alchemy', 40), prof('herbalism', 120), prof('fishing', 150)] }),
]

describe('Charaktertabelle sortieren', () => {
  it('Name A–Z und Z–A', () => {
    expect(names(sortCharacterRows(rows, { key: 'name', direction: 'asc' }))).toEqual(['Anna Amsel', 'Bruno Bart', 'Carla Cello', 'Dora Dachs'])
    expect(names(sortCharacterRows(rows, { key: 'name', direction: 'desc' }))).toEqual(['Dora Dachs', 'Carla Cello', 'Bruno Bart', 'Anna Amsel'])
  })

  it('Stufe numerisch, Gleichstand nach Name', () => {
    expect(names(sortCharacterRows(rows, { key: 'level', direction: 'desc' }))).toEqual(['Anna Amsel', 'Bruno Bart', 'Dora Dachs', 'Carla Cello'])
    expect(names(sortCharacterRows(rows, { key: 'level', direction: 'asc' }))).toEqual(['Carla Cello', 'Bruno Bart', 'Dora Dachs', 'Anna Amsel'])
  })

  it('Klasse und Volk nach deutschem Namen', () => {
    // Druide, Jäger, Magier, Priester
    expect(names(sortCharacterRows(rows, { key: 'class', direction: 'asc' }))).toEqual(['Carla Cello', 'Dora Dachs', 'Bruno Bart', 'Anna Amsel'])
    // Gnom, Mensch, Nachtelf, Zwerg
    expect(names(sortCharacterRows(rows, { key: 'race', direction: 'asc' }))).toEqual(['Bruno Bart', 'Dora Dachs', 'Carla Cello', 'Anna Amsel'])
  })

  it('Beruf: alphabetisch erster Hauptberuf; fehlende Berufe immer am Ende', () => {
    // Alchemie (Dora), Bergbau (Anna), Verzauberkunst (Bruno, vor Schneiderei), Carla ohne Berufe
    expect(names(sortCharacterRows(rows, { key: 'profession', direction: 'asc' }))).toEqual(['Dora Dachs', 'Anna Amsel', 'Bruno Bart', 'Carla Cello'])
    expect(names(sortCharacterRows(rows, { key: 'profession', direction: 'desc' }))).toEqual(['Bruno Bart', 'Anna Amsel', 'Dora Dachs', 'Carla Cello'])
  })

  it('Skill: höchster Hauptberufsskill (Sekundärberufe zählen nicht); fehlende am Ende', () => {
    // Anna 300 (Kochen 300 zählt nicht extra), Bruno 225, Dora 120 (Angeln 150 zählt nicht), Carla –
    expect(names(sortCharacterRows(rows, { key: 'skill', direction: 'desc' }))).toEqual(['Anna Amsel', 'Bruno Bart', 'Dora Dachs', 'Carla Cello'])
    expect(names(sortCharacterRows(rows, { key: 'skill', direction: 'asc' }))).toEqual(['Dora Dachs', 'Bruno Bart', 'Anna Amsel', 'Carla Cello'])
  })

  it('verändert die Eingabe nicht', () => {
    const before = names(rows)
    sortCharacterRows(rows, { key: 'level', direction: 'asc' })
    expect(names(rows)).toEqual(before)
  })
})

describe('Berufe und Sortierwechsel', () => {
  it('zeigt höchstens zwei Hauptberufe, höchster Skill zuerst', () => {
    const character = { professions: [prof('alchemy', 40), prof('herbalism', 120), prof('mining', 80), prof('fishing', 150)] }
    expect(primaryProfessions(character).map(entry => entry.id)).toEqual(['herbalism', 'mining'])
    expect(secondaryProfessions(character).map(entry => entry.id)).toEqual(['fishing'])
  })

  it('gleiche Spalte dreht die Richtung, neue Spalte beginnt aufsteigend', () => {
    expect(nextSort({ key: 'name', direction: 'asc' }, 'name')).toEqual({ key: 'name', direction: 'desc' })
    expect(nextSort({ key: 'name', direction: 'desc' }, 'name')).toEqual({ key: 'name', direction: 'asc' })
    expect(nextSort(defaultCharacterSort, 'skill')).toEqual({ key: 'skill', direction: 'asc' })
  })
})

describe('Twinks unter dem Main gruppieren', () => {
  const entry = (name: string, player: string, level: number, isMain: boolean) =>
    ({ ...row(name, { level, isMain }), player: { id: player } })

  it('stellt Twinks direkt unter ihren Main, Gruppen in der Reihenfolge der Mains', () => {
    const rows = [
      entry('Jahed', 'p1', 29, true),
      entry('Minyu', 'p2', 24, true),
      entry('Nak', 'p3', 24, true),
      entry('Schminyu', 'p2', 16, false),
      entry('Nacht', 'p3', 7, false),
    ]
    const grouped = groupCharacterRows(sortCharacterRows(rows, { key: 'level', direction: 'desc' }))
    expect(grouped.map(item => [item.character.name, item.twink])).toEqual([
      ['Jahed', false], ['Minyu', false], ['Schminyu', true], ['Nak', false], ['Nacht', true],
    ])
  })

  it('der Main bleibt oben, auch wenn ein Twink höher sortiert wäre', () => {
    const grouped = groupCharacterRows(sortCharacterRows([entry('Main', 'p1', 10, true), entry('Twink', 'p1', 40, false)], { key: 'level', direction: 'desc' }))
    expect(grouped.map(item => item.character.name)).toEqual(['Main', 'Twink'])
  })

  it('ohne Main führt der erste Charakter in der Sortierung', () => {
    const grouped = groupCharacterRows(sortCharacterRows([entry('A', 'p1', 10, false), entry('B', 'p1', 20, false)], { key: 'level', direction: 'desc' }))
    expect(grouped.map(item => [item.character.name, item.twink])).toEqual([['B', false], ['A', true]])
  })
})
