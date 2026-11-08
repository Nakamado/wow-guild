import type { BlizzardClient } from './client'
import { matchBlizzardProfession } from '#shared/data/professions'
import { races } from '#shared/data/races'
import type { Profession } from '#shared/types'

/**
 * Fortschritt eines Charakters aus der Blizzard-API (WoW: Forever) – vorerst nur das, was
 * zuverlässig geliefert wird: Stufe, Klasse und Berufe. Dungeons/Raids folgen, sobald
 * `encounters/dungeons` Inhalte liefert (siehe docs/ADDON-PLAN.md).
 */
export interface BlizzardCharacterProgress {
  /** stabile ID aus der API (Charakter-ID), sonst der Slug */
  characterId: string
  slug: string
  name: string
  level: number
  classId: string
  faction: 'alliance' | 'horde' | null
  professions: Profession[]
  /** letzter Login laut API (ISO) – die Daten hinken dem Spiel rund 13 Stunden hinterher */
  lastLoginAt: string | null
}

/** Blizzard-Klassen-IDs → Klassen-Slugs der Webseite */
const classIds: Record<number, string> = {
  1: 'warrior', 2: 'paladin', 3: 'hunter', 4: 'rogue', 5: 'priest', 7: 'shaman', 8: 'mage', 9: 'warlock', 11: 'druid',
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)
const text = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : null)
const num = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null)

/** Blizzard-Volks-IDs → Volks-Slugs (neue Forever-Völker werden über den Namen zugeordnet) */
const raceIds: Record<number, string> = {
  1: 'human', 2: 'orc', 3: 'dwarf', 4: 'night-elf', 5: 'undead', 6: 'tauren', 7: 'gnome', 8: 'troll',
}

export interface GameCharacterProfile {
  name: string
  level: number
  /** null, wenn Blizzard eine unbekannte Klasse bzw. ein unbekanntes Volk liefert */
  classId: string | null
  raceId: string | null
  faction: 'alliance' | 'horde' | null
}

/** Stammdaten aus dem Charakterprofil lesen (Stufe, Klasse, Volk, Fraktion) */
export function parseCharacterProfile(body: unknown, fallbackName: string): GameCharacterProfile | null {
  if (!isObject(body)) return null
  const level = num(body.level)
  if (level === null) return null
  const classNumber = isObject(body.character_class) ? num(body.character_class.id) : null
  const race = isObject(body.race) ? body.race : null
  const raceNumber = race ? num(race.id) : null
  const raceName = race ? text(race.name)?.toLocaleLowerCase('de-DE') : null
  const raceId = (raceNumber !== null && raceIds[raceNumber])
    || (raceName ? races.find(entry => [entry.name, entry.nameEn].some(value => value.toLocaleLowerCase('de-DE') === raceName))?.id : undefined)
    || null
  const factionType = isObject(body.faction) ? text(body.faction.type) : null
  return {
    name: [text(body.name), text(body.surname)].filter(Boolean).join(' ') || fallbackName,
    level,
    classId: (classNumber !== null && classIds[classNumber]) || null,
    raceId,
    faction: factionType === 'ALLIANCE' ? 'alliance' : factionType === 'HORDE' ? 'horde' : null,
  }
}

/** „Nak Totembart“ → „nak-totembart“ (Pfad der realmlosen Profil-Endpunkte) */
export function characterSlug(name: string): string {
  return name.trim().toLocaleLowerCase('de-DE').split(/\s+/).join('-')
}

/**
 * NUXT_BLIZZARD_PREVIEW_CHARACTERS lesen: „Nak Totembart=591736149647687697, Zweiter Char“.
 * Die optionale Discord-ID ordnet den Charakter einer Person zu (manuell durch einen Admin – nur mit Einverständnis).
 */
export function parsePreviewCharacters(value: string): { name: string, discordId: string | null }[] {
  return value.split(',').map((entry) => {
    const [name = '', id = ''] = entry.split('=').map(part => part.trim())
    return { name, discordId: /^\d{17,20}$/.test(id) ? id : null }
  }).filter(entry => entry.name)
}

const professionSlug = (name: string) =>
  name.toLocaleLowerCase('de-DE').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

/**
 * Berufe aus `/professions` lesen – mit Stufen (`tiers`) oder direkt mit `skill_points`.
 * Zuordnung zum Katalog über die Blizzard-ID, sonst über den deutschen Namen.
 */
export function parseProfessions(body: unknown): Profession[] {
  if (!isObject(body)) return []
  const lists: [unknown, Profession['kind']][] = [[body.primaries, 'primary'], [body.secondaries, 'secondary']]
  const result: Profession[] = []
  for (const [list, kind] of lists) {
    for (const entry of Array.isArray(list) ? list : []) {
      if (!isObject(entry) || !isObject(entry.profession)) continue
      const name = text(entry.profession.name)
      const blizzardId = num(entry.profession.id)
      if (!name && blizzardId === null) continue
      const tiers = Array.isArray(entry.tiers) ? entry.tiers.filter(isObject) : []
      const skill = Math.max(num(entry.skill_points) ?? 0, ...tiers.map(tier => num(tier.skill_points) ?? 0))
      const maxValues = [num(entry.max_skill_points), ...tiers.map(tier => num(tier.max_skill_points))].filter((value): value is number => value !== null)
      const known = matchBlizzardProfession(blizzardId, name)
      result.push({
        id: known?.id ?? (name ? professionSlug(name) : `profession-${blizzardId}`),
        name: known?.name ?? name ?? `Beruf ${blizzardId}`,
        kind: known?.kind ?? kind,
        skill,
        maxSkill: maxValues.length ? Math.max(...maxValues) : null,
        source: 'blizzard-api',
      })
    }
  }
  return result
}

/** Profil + Berufe zu einem Fortschritt zusammenführen; ohne gültiges Profil `null` */
export function parseCharacterProgress(slug: string, fallbackName: string, profile: unknown, professions: unknown): BlizzardCharacterProgress | null {
  if (!isObject(profile)) return null
  const level = num(profile.level)
  if (level === null) return null
  const classNumber = isObject(profile.character_class) ? num(profile.character_class.id) : null
  const name = [text(profile.name), text(profile.surname)].filter(Boolean).join(' ') || fallbackName
  const lastLogin = num(profile.last_login_timestamp)
  const id = num(profile.id)
  return {
    characterId: id !== null ? `bnet-${id}` : `bnet-${slug}`,
    slug,
    name,
    level,
    classId: (classNumber !== null && classIds[classNumber]) || 'unknown',
    faction: isObject(profile.faction) && profile.faction.type === 'ALLIANCE' ? 'alliance' : isObject(profile.faction) && profile.faction.type === 'HORDE' ? 'horde' : null,
    professions: parseProfessions(professions),
    lastLoginAt: lastLogin ? new Date(lastLogin).toISOString() : null,
  }
}

export interface CharacterMedia {
  /** kleines Porträt (quadratisch) */
  avatarUrl: string | null
  /** Brustbild mit Hintergrund */
  insetUrl: string | null
  /** ganzer Charakter, freigestellt */
  mainUrl: string | null
}

const RENDER_HOST = 'https://render.worldofwarcraft.com/'

/** Bilder aus `/character-media` lesen – nur Adressen vom Blizzard-Render-Server */
export function parseCharacterMedia(body: unknown): CharacterMedia | null {
  if (typeof body !== 'object' || body === null || !Array.isArray((body as { assets?: unknown }).assets)) return null
  const assets = new Map<string, string>()
  for (const asset of (body as { assets: unknown[] }).assets) {
    if (typeof asset !== 'object' || asset === null) continue
    const { key, value } = asset as { key?: unknown, value?: unknown }
    if (typeof key === 'string' && typeof value === 'string' && value.startsWith(RENDER_HOST)) assets.set(key, value)
  }
  const media = { avatarUrl: assets.get('avatar') ?? null, insetUrl: assets.get('inset') ?? null, mainUrl: assets.get('main-raw') ?? assets.get('main') ?? null }
  return media.avatarUrl || media.insetUrl || media.mainUrl ? media : null
}

/** Charakterbilder abrufen; `null` = keine Bilder (z. B. noch nie gerendert oder unbekannt) */
export async function fetchCharacterMedia(client: BlizzardClient, token: string, region: string, name: string): Promise<CharacterMedia | null> {
  const path = `/profile/wow/character/${encodeURIComponent(characterSlug(name))}/character-media`
  const response = await client.get(path, `profile-forever-${region}`, token)
  return response.status === 200 ? parseCharacterMedia(response.body) : null
}

/** Nur die Berufe eines Charakters abrufen; `null` = nicht abrufbar (z. B. unbekannt oder API-Störung) */
export async function fetchCharacterProfessions(client: BlizzardClient, token: string, region: string, name: string): Promise<Profession[] | null> {
  const path = `/profile/wow/character/${encodeURIComponent(characterSlug(name))}/professions`
  const response = await client.get(path, `profile-forever-${region}`, token)
  return response.status === 200 ? parseProfessions(response.body) : null
}

/** Einen Charakter per App-Token abrufen (realmloser Profilpfad). Fehler → `null`, nie Tokens im Log. */
export async function fetchCharacterProgress(client: BlizzardClient, token: string, region: string, name: string): Promise<BlizzardCharacterProgress | null> {
  const slug = characterSlug(name)
  const base = `/profile/wow/character/${encodeURIComponent(slug)}`
  const namespace = `profile-forever-${region}`
  const profile = await client.get(base, namespace, token)
  if (profile.status !== 200) {
    console.warn(`[blizzard] Charakter „${slug}“ nicht abrufbar (HTTP ${profile.status})`)
    return null
  }
  const professions = await client.get(`${base}/professions`, namespace, token)
  return parseCharacterProgress(slug, name, profile.body, professions.status === 200 ? professions.body : null)
}
