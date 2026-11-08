import type { H3Event } from 'h3'
import { createBlizzardClient, type BlizzardClient } from '../providers/blizzard/client'
import { fetchGuildCreatedAt, fetchGuildRoster, type GuildRosterEntry } from '../providers/blizzard/guild'
import { characterSlug, fetchCharacterMedia, fetchCharacterProfessions, parseCharacterProfile, type GameCharacterProfile } from '../providers/blizzard/progress'
import type { Character, Profession } from '#shared/types'

let cachedClient: { key: string, client: BlizzardClient } | null = null

/** Ein Client pro Zugangsdaten – so wird das App-Token zwischen Anfragen wiederverwendet */
export function blizzardClient(event?: H3Event): { client: BlizzardClient, region: string } | null {
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

/**
 * Blizzard kennt Charaktere erst ab Stufe 10, nach dem Ausloggen und mit einigen Stunden Verzögerung.
 * Deshalb ist „nicht gefunden“ kein hartes Nein: Man kann bewusst trotzdem speichern (`?allowUnknown=1`).
 */
export const notInGameError = (name: string) => ({
  code: 'character-not-in-game',
  message: `„${name}“ ist bei Blizzard (noch) nicht zu finden. Bitte prüfe die Schreibweise. `
    + 'Blizzard zeigt Charaktere erst ab Stufe 10 und nach dem Ausloggen – mit einigen Stunden Verzögerung. '
    + 'Du kannst ihn trotzdem eintragen; sobald Blizzard ihn kennt, aktualisieren sich Stufe, Klasse und Volk automatisch.',
})

/**
 * Prüft beim Eintragen/Umbenennen, ob es den Charakter gibt (Vertrauensbasis: nur Existenz, kein Eigentum).
 * Nur ein eindeutiges „gibt es nicht“ hält an – und auch das nur, solange nicht bewusst bestätigt wurde.
 * Demo, fehlende Zugangsdaten oder Störungen blockieren nie.
 */
export async function assertCharacterExistsInGame(event: H3Event, name: string): Promise<void> {
  if (getQuery(event).allowUnknown === '1') return
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

/** Gildenliste höchstens alle 30 Minuten abrufen – ein Aufruf für alle Charaktere */
export const cachedGuildRoster = defineCachedFunction(async (guildSlug: string): Promise<GuildRosterEntry[] | null> => {
  const blizzard = blizzardClient()
  if (!blizzard) return null
  const app = await blizzard.client.getAppToken()
  if (!app.token) throw new Error('Kein Blizzard-App-Token') // Fehler werden nicht zwischengespeichert
  return fetchGuildRoster(blizzard.client, app.token, blizzard.region, guildSlug)
}, { name: 'guild-roster', maxAge: 30 * 60, swr: true, getKey: (guildSlug: string) => guildSlug.toLowerCase() })

/** Gründungszeitpunkt der Gilde laut Blizzard-API (ändert sich nie – 6 Std. Cache) */
const cachedGuildCreatedAt = defineCachedFunction(async (guildSlug: string): Promise<string | null> => {
  const blizzard = blizzardClient()
  if (!blizzard) return null
  const app = await blizzard.client.getAppToken()
  if (!app.token) throw new Error('Kein Blizzard-App-Token')
  return fetchGuildCreatedAt(blizzard.client, app.token, blizzard.region, guildSlug)
}, { name: 'guild-created', maxAge: 6 * 60 * 60, swr: true, getKey: (guildSlug: string) => guildSlug.toLowerCase() })

/** Gildenliste und Gründungsdatum der konfigurierten Gilde; null-Werte = nicht verfügbar */
export async function guildOverview(): Promise<{ roster: GuildRosterEntry[] | null, createdAt: string | null }> {
  const guildSlug = String(useRuntimeConfig().blizzard.guildSlug ?? '').trim()
  if (!guildSlug) return { roster: null, createdAt: null }
  const [roster, createdAt] = await Promise.all([
    cachedGuildRoster(guildSlug).catch(() => null),
    cachedGuildCreatedAt(guildSlug).catch(() => null),
  ])
  return { roster, createdAt }
}

const cachedCharacterMedia = defineCachedFunction(async (name: string) => {
  const blizzard = blizzardClient()
  if (!blizzard) return null
  const app = await blizzard.client.getAppToken()
  if (!app.token) throw new Error('Kein Blizzard-App-Token')
  return fetchCharacterMedia(blizzard.client, app.token, blizzard.region, name)
}, { name: 'character-media', maxAge: 60 * 60, swr: true, getKey: (name: string) => characterSlug(name) })

/** Charakterbilder von Blizzard (1 Std. Cache); null = keine Bilder oder API nicht erreichbar */
export async function characterMedia(name: string) {
  return cachedCharacterMedia(name).catch(() => null)
}

/** Gildenliste als Map nach Charakter-Slug; `null` = keine verlässlichen Daten (dann nichts anzeigen) */
export async function guildRosterBySlug(): Promise<Map<string, GuildRosterEntry> | null> {
  const guildSlug = String(useRuntimeConfig().blizzard.guildSlug ?? '').trim()
  if (!guildSlug) return null
  const roster = await cachedGuildRoster(guildSlug).catch(() => null)
  return roster ? new Map(roster.map(entry => [entry.slug, entry])) : null
}

/**
 * Live: Stufe, Klasse, Volk, Fraktion und Berufe aus der Blizzard-API übernehmen (API-first) –
 * so bleibt die Stufe aktuell, ohne dass jemand sie pflegen muss. Demo-Daten und Charaktere,
 * für die die API nichts liefert, bleiben unverändert; vorhandene Werte werden nie geleert.
 */
export async function withGameData(characters: Character[]): Promise<Character[]> {
  if (!blizzardClient()) return characters
  const roster = await guildRosterBySlug()
  return Promise.all(characters.map(async (base) => {
    // Gilde: nur wenn die Liste geladen werden konnte – ein Fehler macht niemanden zum Nicht-Mitglied
    const entry = roster?.get(characterSlug(base.name))
    const character: Character = roster ? { ...base, guild: { inGuild: Boolean(entry), rank: entry?.rank ?? null } } : base
    const data = await cachedGameData(base.name).catch(() => null)
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
