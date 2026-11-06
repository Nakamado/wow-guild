import { findClass, gameClasses } from '../data/classes'
import { findRace, races } from '../data/races'
import { getRole } from '../data/roles'
import type { Character, CharacterInput, Faction, GameClass, Race, RoleId } from '../types'
import { fail, ok, type DomainResult } from './result'

export interface GameCatalog {
  classes: readonly GameClass[]
  races: readonly Race[]
}

export const defaultCatalog: GameCatalog = { classes: gameClasses, races }

/** Rollen, die eine Klasse grundsätzlich übernehmen kann */
export function rolesForClass(classId: string, catalog: GameCatalog = defaultCatalog): readonly RoleId[] {
  return findClass(classId, catalog.classes)?.roles ?? []
}

/**
 * Kann der Charakter diese Rolle in einer Gruppe spielen?
 * Die Rolle muss zur Klasse passen UND vom Charakter als Spielrolle hinterlegt sein.
 */
export function canPlayRole(
  character: Pick<Character, 'classId' | 'roles' | 'name'>,
  role: RoleId,
  catalog: GameCatalog = defaultCatalog,
): DomainResult<true, 'role-not-supported-by-class' | 'role-not-chosen'> {
  const gameClass = findClass(character.classId, catalog.classes)
  if (!gameClass || !gameClass.roles.includes(role)) {
    const className = gameClass?.name ?? 'Diese Klasse'
    return fail('role-not-supported-by-class', `${className} kann nicht als ${getRole(role).name} spielen.`)
  }
  if (!character.roles.includes(role)) {
    return fail(
      'role-not-chosen',
      `${character.name} hat ${getRole(role).name} nicht als Spielrolle hinterlegt.`,
    )
  }
  return ok(true)
}

/** Ist die Kombination aus Volk, Klasse und Fraktion spielbar? (für die Charakterpflege) */
export function isValidRaceClass(
  raceId: string,
  classId: string,
  faction: Faction,
  catalog: GameCatalog = defaultCatalog,
): boolean {
  const race = findRace(raceId, catalog.races)
  return Boolean(race?.classesByFaction[faction]?.includes(classId))
}

/** Plausibilitätsprüfung eines Charakters gegen den Katalog */
export function validateCharacter(
  character: Character,
  catalog: GameCatalog = defaultCatalog,
): DomainResult<Character, 'unknown-class' | 'unknown-race' | 'invalid-race-class' | 'invalid-roles'> {
  const gameClass = findClass(character.classId, catalog.classes)
  if (!gameClass) return fail('unknown-class', 'Unbekannte Klasse.')
  const race = findRace(character.raceId, catalog.races)
  if (!race) return fail('unknown-race', 'Unbekanntes Volk.')
  if (!isValidRaceClass(character.raceId, character.classId, character.faction, catalog)) {
    return fail('invalid-race-class', `${race.name} kann in dieser Fraktion kein ${gameClass.name} sein.`)
  }
  if (!character.roles.every(role => gameClass.roles.includes(role))) {
    return fail('invalid-roles', `Mindestens eine Rolle passt nicht zur Klasse ${gameClass.name}.`)
  }
  return ok(character)
}

export type CharacterRuleCode
  = | 'unknown-class'
    | 'unknown-race'
    | 'invalid-race-class'
    | 'invalid-roles'
    | 'name-taken'
    | 'too-many-characters'
    | 'not-found'
    | 'has-signups'

/**
 * Prüft einen eigenen Charakter vor dem Speichern (Demo und Live identisch).
 * `existing` = alle Charaktere des Mitglieds, `editingId` beim Bearbeiten.
 */
export function checkCharacterInput(
  input: CharacterInput,
  existing: readonly Pick<Character, 'id' | 'name'>[],
  options: { editingId?: string, maxCharacters: number, catalog?: GameCatalog },
): DomainResult<CharacterInput, CharacterRuleCode> {
  const catalog = options.catalog ?? defaultCatalog
  const gameClass = findClass(input.classId, catalog.classes)
  if (!gameClass) return fail('unknown-class', 'Bitte wähle eine Klasse.')
  const race = findRace(input.raceId, catalog.races)
  if (!race) return fail('unknown-race', 'Bitte wähle ein Volk.')
  if (!isValidRaceClass(input.raceId, input.classId, input.faction, catalog)) {
    return fail('invalid-race-class', `${race.name} kann in dieser Fraktion kein ${gameClass.name} sein.`)
  }
  const invalidRole = input.roles.find(role => !gameClass.roles.includes(role))
  if (invalidRole) return fail('invalid-roles', `${gameClass.name} kann nicht als ${getRole(invalidRole).name} spielen.`)

  const others = existing.filter(character => character.id !== options.editingId)
  if (others.some(character => character.name.toLocaleLowerCase('de') === input.name.toLocaleLowerCase('de'))) {
    return fail('name-taken', `Du hast bereits einen Charakter namens ${input.name}.`)
  }
  if (!options.editingId && existing.length >= options.maxCharacters) {
    return fail('too-many-characters', `Du kannst höchstens ${options.maxCharacters} Charaktere eintragen.`)
  }
  return ok(input)
}

/** Neuer Hauptcharakter: genau einer je Mitglied (Liste der eigenen Charaktere). */
export function withMainCharacter<T extends Pick<Character, 'id' | 'isMain'>>(characters: readonly T[], mainId: string): T[] {
  return characters.map(character => ({ ...character, isMain: character.id === mainId }))
}

/** Hauptcharakter zuerst, danach nach Stufe absteigend, dann nach Name. */
export function sortCharacters<T extends Pick<Character, 'isMain' | 'level' | 'name'>>(characters: readonly T[]): T[] {
  return [...characters].sort((a, b) => Number(b.isMain) - Number(a.isMain) || b.level - a.level || a.name.localeCompare(b.name, 'de'))
}

/** Stammdaten eines Charakters, wie sie die Blizzard-API liefert */
export interface GameProfileData {
  level: number
  classId: string | null
  raceId: string | null
  faction: Faction | null
}

/**
 * Schnelles Eintragen: aus Name + Wunschrollen und den Blizzard-Daten einen vollständigen Charakter bauen.
 * Rollen, die die Klasse nicht kann, fallen weg; bleibt keine übrig, gelten alle Rollen der Klasse.
 * Fehlen Klasse oder Volk (unbekannt), muss man die Angaben selbst eintragen.
 */
export function characterFromGame(
  input: { name: string, roles: readonly RoleId[] },
  profile: GameProfileData,
  defaultFaction: Faction,
  catalog: GameCatalog = defaultCatalog,
): DomainResult<CharacterInput, 'game-data-incomplete'> {
  const classRoles = profile.classId ? rolesForClass(profile.classId, catalog) : []
  if (!profile.classId || !profile.raceId || !classRoles.length) {
    return fail('game-data-incomplete', 'Blizzard liefert für diesen Charakter nicht alle Angaben – bitte ergänze Volk und Klasse selbst.')
  }
  const wanted = input.roles.filter(role => classRoles.includes(role))
  return ok({
    name: input.name,
    faction: profile.faction ?? defaultFaction,
    classId: profile.classId,
    raceId: profile.raceId,
    level: Math.min(Math.max(profile.level, 1), 60),
    roles: wanted.length ? wanted : [...classRoles],
  })
}
