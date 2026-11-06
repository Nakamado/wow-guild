import { pointsRules } from '../../content/points'
import { createDemoProgress } from '../../data/demo/progress'
import { createBlizzardClient } from '../providers/blizzard/client'
import { characterSlug, fetchCharacterProgress, parsePreviewCharacters, type BlizzardCharacterProgress } from '../providers/blizzard/progress'
import { instances } from '#shared/data/dungeons'
import { buildLeaderboards, explainScore, retroactiveEvents, type LeaderboardRow } from '#shared/domain/points'
import type { ProgressEvent } from '#shared/schemas/points'

/**
 * Ranglisten (Main + Gesamt). Punkte berechnet ausschließlich der Server – jede Zeile bringt ihre
 * Aufschlüsselung mit („So kommen die Punkte zustande“).
 * - Demo: fiktive Fortschritte
 * - Live: vorerst nur ein Testlauf mit den in NUXT_BLIZZARD_PREVIEW_CHARACTERS genannten Charakteren
 *   (Stufe + Berufe direkt aus der Blizzard-API). Später: alle Mitglieder mit Opt-in.
 */

interface CharacterInfo {
  id: string
  memberId: string
  name: string
  classId: string
  level: number
}

interface MemberInfo {
  id: string
  displayName: string
  avatarUrl: string | null
}

const professionNames: Record<string, string> = {
  alchemy: 'Alchemie',
  blacksmithing: 'Schmiedekunst',
  enchanting: 'Verzauberkunst',
  herbalism: 'Kräuterkunde',
  mining: 'Bergbau',
  tailoring: 'Schneiderei',
}

/** Längster Instanz-Slug, mit dem die Objekt-ID beginnt (z. B. „the-deadmines:3:1“) */
const instanceName = (objectId: string) =>
  instances.filter(instance => objectId === instance.slug || objectId.startsWith(`${instance.slug}:`) || objectId.startsWith(`${instance.slug}-`))
    .sort((a, b) => b.slug.length - a.slug.length)[0]?.name ?? objectId

function describer(extraProfessionNames: Record<string, string>) {
  return (event: ProgressEvent): string => {
    if (event.type === 'profession-milestone') {
      const [id = '', milestone = ''] = event.objectId.split(':')
      return `${extraProfessionNames[id] ?? professionNames[id] ?? id} – Skill ${milestone}`
    }
    return instanceName(event.objectId)
  }
}

function buildResponse(
  options: { isDemo: boolean, isPreview: boolean, updatedAt: string | null },
  events: ProgressEvent[],
  members: MemberInfo[],
  characters: CharacterInfo[],
  mainIds: Map<string, string>,
  extraProfessionNames: Record<string, string> = {},
) {
  const describe = describer(extraProfessionNames)
  const boards = buildLeaderboards(events, members.map(member => ({ memberId: member.id, mainCharacterId: mainIds.get(member.id) ?? null })), pointsRules)
  const memberById = new Map(members.map(member => [member.id, member]))
  const characterById = new Map(characters.map(character => [character.id, character]))

  const enrich = (row: LeaderboardRow) => {
    const member = memberById.get(row.memberId)
    const main = characterById.get(mainIds.get(row.memberId) ?? '')
    const perCharacter = new Map<string, number>()
    for (const entry of row.score.entries) perCharacter.set(entry.event.characterId, (perCharacter.get(entry.event.characterId) ?? 0) + entry.granted)
    return {
      rank: row.rank,
      memberId: row.memberId,
      displayName: member?.displayName ?? 'Unbekannt',
      avatarUrl: member?.avatarUrl ?? null,
      mainCharacter: main ? { id: main.id, name: main.name, classId: main.classId, level: main.level } : null,
      characterCount: characters.filter(character => character.memberId === row.memberId).length,
      points: row.points,
      capped: row.score.capped,
      breakdown: {
        lines: explainScore(row.score, describe),
        characters: [...perCharacter.entries()]
          .map(([id, points]) => ({ id, name: characterById.get(id)?.name ?? 'Unbekannt', points }))
          .sort((a, b) => b.points - a.points),
      },
    }
  }
  return { ...options, rules: pointsRules, total: boards.total.map(enrich), main: boards.main.map(enrich) }
}

/** Testcharaktere höchstens alle 30 Minuten neu abrufen (die API hinkt ohnehin ~13 Std. hinterher) */
const loadPreviewCharacters = defineCachedFunction(async (names: string[], clientId: string, clientSecret: string, region: string) => {
  const client = createBlizzardClient({ clientId, clientSecret, region })
  const app = await client.getAppToken()
  // werfen statt leer zurückgeben: Fehler werden nicht zwischengespeichert
  if (!app.token) throw new Error('Kein Blizzard-App-Token')
  const results = await Promise.all(names.map(name => fetchCharacterProgress(client, app.token!, region, name).catch(() => null)))
  return results.filter((result): result is BlizzardCharacterProgress => result !== null)
}, { name: 'leaderboard-preview', maxAge: 30 * 60, getKey: (names: string[]) => names.join(',').toLowerCase() })

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  const demo = Boolean(config.public.demoMode)

  if (demo) {
    const providers = useProviders()
    const [members, characters] = await Promise.all([providers.members.listGuildMembers(), providers.characters.list()])
    const mains = new Map(characters.filter(character => character.isMain).map(character => [character.memberId, character.id]))
    return buildResponse(
      { isDemo: true, isPreview: false, updatedAt: null },
      createDemoProgress(characters, pointsRules, new Date()),
      members.map(member => ({ id: member.id, displayName: member.displayName, avatarUrl: member.avatarUrl ?? null })),
      characters.map(character => ({ id: character.id, memberId: character.memberId, name: character.name, classId: character.classId, level: character.level })),
      mains,
    )
  }

  // „Vorname Nachname“ oder „Vorname Nachname=DiscordID“ (verknüpft den Charakter mit dem Discord-Konto)
  const entries = parsePreviewCharacters(String(config.blizzard.previewCharacters ?? ''))
  const names = entries.map(entry => entry.name)
  const clientId = String(config.blizzard.clientId ?? '')
  const clientSecret = String(config.blizzard.clientSecret ?? '')
  if (!names.length || !clientId || !clientSecret) {
    return buildResponse({ isDemo: false, isPreview: false, updatedAt: null }, [], [], [], new Map())
  }

  const region = String(config.blizzard.region || 'eu').toLowerCase()
  const preview = await loadPreviewCharacters(names, clientId, clientSecret, region).catch((error: unknown) => {
    console.warn('[leaderboard] Testlauf nicht abrufbar:', error instanceof Error ? error.message : 'unbekannt')
    return [] as BlizzardCharacterProgress[]
  })
  // Mit Discord-ID: Person = Discord-Konto (Name + Profilbild aus Discord); sonst der Charakter selbst
  const providers = useProviders()
  const ownerOf = (character: BlizzardCharacterProgress) =>
    entries.find(entry => characterSlug(entry.name) === character.slug)?.discordId ?? `preview:${character.slug}`
  const ownerIds = [...new Set(preview.map(ownerOf))]
  const members = await Promise.all(ownerIds.map(async (id) => {
    const fallback = preview.find(character => ownerOf(character) === id)!.name
    if (id.startsWith('preview:')) return { id, displayName: fallback, avatarUrl: null }
    const member = await providers.members.getMember(id).catch(() => null)
    return { id, displayName: member?.displayName ?? fallback, avatarUrl: member?.avatarUrl ?? null }
  }))
  const characters = preview.map(character => ({ id: character.characterId, memberId: ownerOf(character), name: character.name, classId: character.classId, level: character.level }))
  const events = preview.flatMap(character => retroactiveEvents({
    memberId: ownerOf(character),
    characterId: character.characterId,
    level: character.level,
    professions: character.professions,
  }, pointsRules))
  // Main je Person: der erste eingetragene Charakter
  const mainIds = new Map<string, string>()
  for (const character of characters) if (!mainIds.has(character.memberId)) mainIds.set(character.memberId, character.id)
  const professionNamesById = Object.fromEntries(preview.flatMap(character => character.professions.map(profession => [profession.id, profession.name])))
  const updatedAt = preview.map(character => character.lastLoginAt).filter(Boolean).sort().at(-1) ?? null

  return buildResponse(
    { isDemo: false, isPreview: preview.length > 0, updatedAt },
    events,
    members,
    characters,
    mainIds,
    professionNamesById,
  )
})
