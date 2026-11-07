import type { BlizzardClient } from './client'

export interface GuildRosterEntry {
  /** „nak-totembart“ – derselbe Slug wie in den Charakterpfaden */
  slug: string
  name: string
  level: number | null
  rank: number
}

type Json = Record<string, unknown>
const isObject = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value)

/** Gildenliste aus `/data/wow/guild/{slug}/roster` lesen; fehlerhafte Einträge werden übersprungen */
export function parseGuildRoster(body: unknown): GuildRosterEntry[] {
  if (!isObject(body) || !Array.isArray(body.members)) return []
  const entries: GuildRosterEntry[] = []
  for (const member of body.members) {
    if (!isObject(member) || !isObject(member.character) || typeof member.rank !== 'number') continue
    const character = member.character
    const first = typeof character.name === 'string' ? character.name.trim() : ''
    const last = typeof character.surname === 'string' ? character.surname.trim() : ''
    const slug = typeof character.slug === 'string' && character.slug
      ? character.slug.toLowerCase()
      : [first, last].filter(Boolean).join('-').toLocaleLowerCase('de-DE')
    if (!slug) continue
    entries.push({
      slug,
      name: [first, last].filter(Boolean).join(' '),
      level: typeof character.level === 'number' ? character.level : null,
      rank: member.rank,
    })
  }
  return entries
}

/** Gildenliste abrufen; `null` = nicht abrufbar (Gilde unbekannt, noch nicht in der API oder Störung) */
export async function fetchGuildRoster(client: BlizzardClient, token: string, region: string, guildSlug: string): Promise<GuildRosterEntry[] | null> {
  const response = await client.get(`/data/wow/guild/${encodeURIComponent(guildSlug.toLowerCase())}/roster`, `profile-forever-${region}`, token)
  return response.status === 200 ? parseGuildRoster(response.body) : null
}
