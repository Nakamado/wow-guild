import { findClass, gameClasses } from '../data/classes'
import { findRace, races } from '../data/races'
import { getRole } from '../data/roles'
import type { Character, Faction, GameClass, Race, RoleId } from '../types'
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
