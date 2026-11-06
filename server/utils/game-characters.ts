import type { H3Event } from 'h3'
import { createBlizzardClient, type BlizzardClient } from '../providers/blizzard/client'
import { characterSlug, fetchCharacterProfessions, parseCharacterProfile, type GameCharacterProfile } from '../providers/blizzard/progress'
import type { Character, Profession } from '#shared/types'

let cachedClient: { key: string, client: BlizzardClient } | null = null

/** Ein Client pro Zugangsdaten – so wird das App-Token zwischen Anfragen wiederverwendet */
function blizzardClient(event?: H3Event): { client: BlizzardClient, region: string } | null {
  const config = useRuntimeConfig(event)
  if (config.public.demoMode) return null
  const clientId = String(config.blizzard.clientId ?? '')
  const clientSecret = String(config.blizzard.clientSecret ?? '')
  if (!clientId || !clientSecret) return null
  const region = String(config.blizzard.region || 'eu').toLowerCase()
  const key = `${clientId}:${region}`
  if (cachedClient?.key !== key) cachedClient = { key, client: createBlizzardClient({ clientId, clientSecret, region }) }
  return { client: cachedClient.client, region }
}

export type GameLookup
  = | { status: 'found', profile: GameCharacterProfile }
    | { status: 'not-found' }
    /** Demo, keine Zugangsdaten oder API-Störung – dann trägt man die Angaben selbst ein */
    | { status: 'unavailable' }

/** Charakter direkt bei Blizzard nachschlagen (ohne Cache – für das Eintragen) */
export async function lookupGameCharacter(event: H3Event | undefined, name: string): Promise<GameLookup> {
  const blizzard = blizzardClient(event)
  if (!blizzard) return { status: 'unavailable' }
  try {
    const app = await blizzard.client.getAppToken()
    if (!app.token) return { status: 'unavailable' }
    const response = await blizzard.client.get(`/profile/wow/character/${encodeURIComponent(characterSlug(name))}`, `profile-forever-${blizzard.region}`, app.token)
    if (response.status === 404) return { status: 'not-found' }
    const profile = response.status === 200 ? parseCharacterProfile(response.body, name) : null
    return profile ? { status: 'found', profile } : { status: 'unavailable' }
  }
  catch (error) {
    console.warn(`[blizzard] Charakter nicht abrufbar: ${error instanceof Error ? error.message : 'unbekannt'}`)
    return { status: 'unavailable' }
  }
}

export const notInGameError = (name: string) => ({
  code: 'character-not-in-game',
  message: `„${name}“ wurde in WoW: Forever (EU) nicht gefunden. Bitte Vor- und Nachnamen prüfen. `
    + 'Ganz neue Charaktere kennt die Blizzard-API erst nach einigen Stunden – dann einfach später noch einmal versuchen.',
})

/**
 * Prüft beim Umbenennen, ob es den Charakter gibt (Vertrauensbasis: nur Existenz, kein Eigentum).
 * Nur ein eindeutiges „gibt es nicht“ blockiert – Demo, fehlende Zugangsdaten oder Störungen nicht.
 */
export async function assertCharacterExistsInGame(event: H3Event, name: string): Promise<void> {
  const result = await lookupGameCharacter(event, name)
  if (result.status === 'not-found') rejectWith(notInGameError(name))
}

/** Profil und Berufe je Charakter höchstens alle 30 Minuten abrufen (die API hinkt ohnehin ~13 Std. hinterher) */
const cachedGameData = defineCachedFunction(async (name: string): Promise<{ profile: GameCharacterProfile | null, professions: Profession[] | null }> => {
  const lookup = await lookupGameCharacter(undefined, name)
  if (lookup.status === 'unavailable') throw new Error('Blizzard nicht erreichbar') // Fehler werden nicht zwischengespeichert
  if (lookup.status === 'not-found') return { profile: null, professions: null }
  const blizzard = blizzardClient()!
  const app = await blizzard.client.getAppToken()
  const professions = app.token ? await fetchCharacterProfessions(blizzard.client, app.token, blizzard.region, name) : null
  return { profile: lookup.profile, professions }
}, { name: 'character-game-data', maxAge: 30 * 60, swr: true, getKey: (name: string) => characterSlug(name) })

/**
 * Live: Stufe, Klasse, Volk, Fraktion und Berufe aus der Blizzard-API übernehmen (API-first) –
 * so bleibt die Stufe aktuell, ohne dass jemand sie pflegen muss. Demo-Daten und Charaktere,
 * für die die API nichts liefert, bleiben unverändert; vorhandene Werte werden nie geleert.
 */
export async function withGameData(characters: Character[]): Promise<Character[]> {
  if (!blizzardClient()) return characters
  return Promise.all(characters.map(async (character) => {
    const data = await cachedGameData(character.name).catch(() => null)
    if (!data?.profile) return character
    const { profile, professions } = data
    return {
      ...character,
      level: profile.level,
      classId: profile.classId ?? character.classId,
      raceId: profile.raceId ?? character.raceId,
      faction: profile.faction ?? character.faction,
      professions: professions?.length ? professions : character.professions,
      source: 'blizzard',
    }
  }))
}
