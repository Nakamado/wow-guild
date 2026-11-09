import { findClass } from '../data/classes'
import { findRace } from '../data/races'
import type { Character, Profession } from '../types'

/** Sortierbare Spalten der Charaktertabelle (/mitglieder) */
export const characterSortKeys = ['name', 'player', 'level', 'class', 'race', 'rank', 'profession', 'skill'] as const
export type CharacterSortKey = (typeof characterSortKeys)[number]
export type SortDirection = 'asc' | 'desc'

export interface CharacterSort {
  key: CharacterSortKey
  direction: SortDirection
}

export interface CharacterTableRow {
  character: Character
  /** Anzeigename der Person, der der Charakter gehört */
  playerName: string
}

/** Die (höchstens zwei) Hauptberufe, höchster Skill zuerst */
export function primaryProfessions(character: Pick<Character, 'professions'>): Profession[] {
  return character.professions
    .filter(profession => profession.kind === 'primary')
    .sort((a, b) => b.skill - a.skill || a.name.localeCompare(b.name, 'de'))
    .slice(0, 2)
}

export function secondaryProfessions(character: Pick<Character, 'professions'>): Profession[] {
  return character.professions.filter(profession => profession.kind === 'secondary')
}

const compareText = (a: string, b: string) => a.localeCompare(b, 'de', { sensitivity: 'base' })

/**
 * Sortierwert einer Spalte; `null` = fehlt.
 * - Beruf: der alphabetisch erste Hauptberuf
 * - Skill: der höchste Hauptberufsskill
 */
function sortValue(row: CharacterTableRow, key: CharacterSortKey): string | number | null {
  const { character } = row
  switch (key) {
    case 'name': return character.name
    case 'player': return row.playerName
    case 'level': return character.level
    case 'class': return findClass(character.classId)?.name ?? character.classId
    case 'race': return findRace(character.raceId)?.name ?? character.raceId
    // Gildenrang: 0 = höchster Rang; nicht in der Gilde oder unbekannt → ans Ende
    case 'rank': return character.guild?.inGuild ? character.guild.rank : null
    case 'profession': {
      const names = primaryProfessions(character).map(profession => profession.name).sort(compareText)
      return names[0] ?? null
    }
    case 'skill': {
      const skills = primaryProfessions(character).map(profession => profession.skill)
      return skills.length ? Math.max(...skills) : null
    }
  }
}

/**
 * Tabelle sortieren – ohne die Eingabe zu verändern.
 * Fehlende Werte (z. B. keine Berufsdaten) stehen unabhängig von der Richtung immer am Ende;
 * bei Gleichstand entscheidet der Charaktername (A–Z), damit die Reihenfolge stabil bleibt.
 */
export function sortCharacterRows<T extends CharacterTableRow>(rows: readonly T[], sort: CharacterSort): T[] {
  const factor = sort.direction === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const left = sortValue(a, sort.key)
    const right = sortValue(b, sort.key)
    if (left === null || right === null) {
      if (left !== right) return left === null ? 1 : -1
    }
    else {
      const result = typeof left === 'number' && typeof right === 'number' ? left - right : compareText(String(left), String(right))
      if (result !== 0) return result * factor
    }
    return compareText(a.character.name, b.character.name)
  })
}

/**
 * Twinks unter ihren Main gruppieren: Die Gruppen stehen in der Reihenfolge ihres Mains
 * (bzw. des ersten Charakters, falls niemand als Main markiert ist), die Twinks darunter
 * in der gewählten Sortierung. `twink` = eingerückt unter dem Main anzeigen.
 */
export function groupCharacterRows<T extends CharacterTableRow & { player: { id: string } }>(sorted: readonly T[]): (T & { twink: boolean })[] {
  const groups = new Map<string, T[]>()
  for (const row of sorted) {
    const group = groups.get(row.player.id)
    if (group) group.push(row)
    else groups.set(row.player.id, [row])
  }
  const heads = [...groups.values()].map(rows => rows.find(row => row.character.isMain) ?? rows[0]!)
  heads.sort((a, b) => sorted.indexOf(a) - sorted.indexOf(b))
  return heads.flatMap(head => [
    { ...head, twink: false },
    ...groups.get(head.player.id)!.filter(row => row !== head).map(row => ({ ...row, twink: true })),
  ])
}

/** Klick auf eine Spalte: gleiche Spalte → Richtung umdrehen; neue Spalte → aufsteigend beginnen */
export function nextSort(current: CharacterSort, key: CharacterSortKey): CharacterSort {
  if (current.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
  return { key, direction: 'asc' }
}

export const defaultCharacterSort: CharacterSort = { key: 'level', direction: 'desc' }
