import type { Profession } from '../types'

/**
 * Berufe in WoW: Forever (wie Classic). `blizzardId` = Skill-Line-ID der Blizzard-API,
 * darüber werden API-Daten eindeutig zugeordnet; der deutsche Name dient als Rückfall.
 */
export interface ProfessionInfo {
  id: string
  name: string
  kind: Profession['kind']
  blizzardId: number
}

export const professions: readonly ProfessionInfo[] = [
  { id: 'alchemy', name: 'Alchemie', kind: 'primary', blizzardId: 171 },
  { id: 'blacksmithing', name: 'Schmiedekunst', kind: 'primary', blizzardId: 164 },
  { id: 'enchanting', name: 'Verzauberkunst', kind: 'primary', blizzardId: 333 },
  { id: 'engineering', name: 'Ingenieurskunst', kind: 'primary', blizzardId: 202 },
  { id: 'herbalism', name: 'Kräuterkunde', kind: 'primary', blizzardId: 182 },
  { id: 'leatherworking', name: 'Lederverarbeitung', kind: 'primary', blizzardId: 165 },
  { id: 'mining', name: 'Bergbau', kind: 'primary', blizzardId: 186 },
  { id: 'skinning', name: 'Kürschnerei', kind: 'primary', blizzardId: 393 },
  { id: 'tailoring', name: 'Schneiderei', kind: 'primary', blizzardId: 197 },
  { id: 'fishing', name: 'Angeln', kind: 'secondary', blizzardId: 356 },
  { id: 'cooking', name: 'Kochkunst', kind: 'secondary', blizzardId: 185 },
  { id: 'first-aid', name: 'Erste Hilfe', kind: 'secondary', blizzardId: 129 },
]

export function findProfession(id: string): ProfessionInfo | undefined {
  return professions.find(profession => profession.id === id)
}

/** Blizzard-Beruf (ID oder Name) dem Katalog zuordnen */
export function matchBlizzardProfession(blizzardId: number | null, name: string | null): ProfessionInfo | undefined {
  if (blizzardId !== null) {
    const byId = professions.find(profession => profession.blizzardId === blizzardId)
    if (byId) return byId
  }
  const normalized = name?.trim().toLocaleLowerCase('de-DE')
  return normalized ? professions.find(profession => profession.name.toLocaleLowerCase('de-DE') === normalized) : undefined
}
