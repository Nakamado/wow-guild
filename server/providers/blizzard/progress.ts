import type { BlizzardClient } from './client'

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
  professions: { id: string, name: string, skill: number }[]
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

/** Berufe aus `/professions` lesen – mit Stufen (`tiers`) oder direkt mit `skill_points` */
export function parseProfessions(body: unknown): BlizzardCharacterProgress['professions'] {
  if (!isObject(body)) return []
  const entries = [body.primaries, body.secondaries].flatMap(list => (Array.isArray(list) ? list : []))
  const result: BlizzardCharacterProgress['professions'] = []
  for (const entry of entries) {
    if (!isObject(entry) || !isObject(entry.profession)) continue
    const name = text(entry.profession.name)
    if (!name) continue
    const tiers = Array.isArray(entry.tiers) ? entry.tiers.filter(isObject) : []
    const skill = Math.max(num(entry.skill_points) ?? 0, ...tiers.map(tier => num(tier.skill_points) ?? 0))
    const id = num(entry.profession.id)
    result.push({ id: id !== null ? String(id) : professionSlug(name), name, skill })
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
    professions: parseProfessions(professions),
    lastLoginAt: lastLogin ? new Date(lastLogin).toISOString() : null,
  }
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
