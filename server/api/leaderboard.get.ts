import { pointsRules } from '../../content/points'
import { createDemoProgress } from '../../data/demo/progress'
import { createBlizzardClient } from '../providers/blizzard/client'
import { characterSlug, fetchCharacterProgress, parsePreviewCharacters, type BlizzardCharacterProgress } from '../providers/blizzard/progress'
import { instances } from '#shared/data/dungeons'
import { findProfession } from '#shared/data/professions'
import { buildLeaderboards, explainScore, retroactiveEvents, type LeaderboardRow } from '#shared/domain/points'
import { questEvents } from '#shared/domain/quests'
import type { CharacterQuestResult } from '../utils/quests'
import type { ProgressEvent, ProgressType } from '#shared/schemas/points'

/** Was die Blizzard-API für WoW: Forever derzeit liefert – Quests ja, Dungeon-Läufe und Raids noch nicht */
const LIVE_TRACKED: ProgressType[] = ['level', 'profession-milestone', 'dungeon-quest', 'group-quest', 'dungeon-first']

/**
 * Ranglisten (Main + Gesamt). Punkte berechnet ausschließlich der Server – jede Zeile bringt ihre
 * Aufschlüsselung mit („So kommen die Punkte zustande“).
 * - Demo: fiktive Fortschritte
 * - Live: alle Gildenmitglieder, die in den Einstellungen zugestimmt haben, mit ihren eingetragenen
 *   Charakteren, soweit diese in der Gilde sind (Stufe + Berufe direkt aus der Blizzard-API).
 * - Ohne Datenbank: Testlauf mit den in NUXT_BLIZZARD_PREVIEW_CHARACTERS genannten Charakteren.
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

/** Längster Instanz-Slug, mit dem die Objekt-ID beginnt (z. B. „the-deadmines:3:1“) */
const instanceName = (objectId: string) =>
  instances.filter(instance => objectId === instance.slug || objectId.startsWith(`${instance.slug}:`) || objectId.startsWith(`${instance.slug}-`))
    .sort((a, b) => b.slug.length - a.slug.length)[0]?.name ?? objectId

interface Names {
  professions?: Record<string, string>
  quests?: Map<number, string>
  groups?: Map<string, string>
}

function describer(names: Names) {
  return (event: ProgressEvent): string => {
    if (event.type === 'profession-milestone') {
      const [id = '', milestone = ''] = event.objectId.split(':')
      return `${findProfession(id)?.name ?? names.professions?.[id] ?? id} – Skill ${milestone}`
    }
    if (event.objectId.startsWith('quest:')) {
      const id = Number(event.objectId.slice(6))
      return names.quests?.get(id) ?? `Quest ${id}`
    }
    if (event.objectId.startsWith('group:')) {
      const id = event.objectId.slice(6)
      return names.groups?.get(id) ?? id
    }
    return instanceName(event.objectId)
  }
}

function buildResponse(
  options: { isDemo: boolean, isPreview: boolean, updatedAt: string | null, tracked: ProgressType[] },
  events: ProgressEvent[],
  members: MemberInfo[],
  characters: CharacterInfo[],
  mainIds: Map<string, string>,
  names: Names = {},
) {
  const describe = describer(names)
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
        lines: explainScore(row.score, describe, id => characterById.get(id)?.name),
        characters: [...perCharacter.entries()]
          .map(([id, points]) => ({ id, name: characterById.get(id)?.name ?? 'Unbekannt', points }))
          .sort((a, b) => b.points - a.points),
      },
    }
  }
  return { ...options, rules: pointsRules, total: boards.total.map(enrich), main: boards.main.map(enrich) }
}

/** Charaktere höchstens alle 30 Minuten neu abrufen (die API hinkt dem Spiel ohnehin hinterher) */
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
      { isDemo: true, isPreview: false, updatedAt: null, tracked: [...pointsRules.repeatable, 'level', 'dungeon-first', 'dungeon-quest', 'group-quest', 'raid-first', 'profession-milestone'] },
      createDemoProgress(characters, pointsRules, new Date()),
      members.map(member => ({ id: member.id, displayName: member.displayName, avatarUrl: member.avatarUrl ?? null })),
      characters.map(character => ({ id: character.id, memberId: character.memberId, name: character.name, classId: character.classId, level: character.level })),
      mains,
    )
  }

  const clientId = String(config.blizzard.clientId ?? '')
  const clientSecret = String(config.blizzard.clientSecret ?? '')
  const store = useMemberSettingsStore()
  const entries = store
    ? await optedInEntries()
    // Ohne Datenbank: „Vorname Nachname“ oder „Vorname Nachname=DiscordID“ aus der Umgebungsvariable
    : parsePreviewCharacters(String(config.blizzard.previewCharacters ?? '')).map(entry => ({ name: entry.name, memberId: entry.discordId ?? null, characterId: null, isMain: false }))
  const isPreview = !store
  const names = entries.map(entry => entry.name)
  if (!names.length || !clientId || !clientSecret) {
    return buildResponse({ isDemo: false, isPreview: false, updatedAt: null, tracked: LIVE_TRACKED }, [], [], [], new Map())
  }

  const region = String(config.blizzard.region || 'eu').toLowerCase()
  const loaded = await loadPreviewCharacters(names, clientId, clientSecret, region).catch((error: unknown) => {
    console.warn('[leaderboard] Charaktere nicht abrufbar:', error instanceof Error ? error.message : 'unbekannt')
    return [] as BlizzardCharacterProgress[]
  })
  const entryOf = (character: BlizzardCharacterProgress) => entries.find(entry => characterSlug(entry.name) === character.slug)
  // Mit Discord-ID: Person = Discord-Konto (Name + Profilbild aus Discord); sonst der Charakter selbst
  const ownerOf = (character: BlizzardCharacterProgress) => entryOf(character)?.memberId ?? `preview:${character.slug}`
  // Seiten-ID verwenden, wenn der Charakter eingetragen ist (verlinkt dann aufs Charakterprofil)
  const idOf = (character: BlizzardCharacterProgress) => entryOf(character)?.characterId ?? character.characterId
  const providers = useProviders()
  const ownerIds = [...new Set(loaded.map(ownerOf))]
  const members = await Promise.all(ownerIds.map(async (id) => {
    const fallback = loaded.find(character => ownerOf(character) === id)!.name
    if (id.startsWith('preview:')) return { id, displayName: fallback, avatarUrl: null }
    const member = await providers.members.getMember(id).catch(() => null)
    return { id, displayName: member?.displayName ?? fallback, avatarUrl: member?.avatarUrl ?? null }
  }))
  const characters = loaded.map(character => ({ id: idOf(character), memberId: ownerOf(character), name: character.name, classId: character.classId, level: character.level }))
  // Quests (Dungeon- und Gruppenquests, Dungeon vollständig) – fällt die Abfrage aus, zählen nur Stufe und Berufe
  const quests = await questProgressFor(loaded.map(character => ({ name: character.name, faction: character.faction }))).catch((error: unknown) => {
    console.warn('[leaderboard] Quests nicht abrufbar:', error instanceof Error ? error.message : 'unbekannt')
    return { results: new Map<string, CharacterQuestResult>(), groupNames: new Map<string, string>() }
  })
  const events = loaded.flatMap((character) => {
    const owner = { memberId: ownerOf(character), characterId: idOf(character) }
    const questResult = quests.results.get(character.slug)
    return [
      ...retroactiveEvents({ ...owner, level: character.level, professions: character.professions }, pointsRules),
      ...(questResult ? questEvents(owner, questResult.progress) : []),
    ]
  })
  const questTitles = new Map([...quests.results.values()].flatMap(result => [...result.titles]))
  // Main je Person: der als Hauptcharakter markierte, sonst der erste
  const mainIds = new Map<string, string>()
  for (const character of loaded) if (entryOf(character)?.isMain) mainIds.set(ownerOf(character), idOf(character))
  for (const character of characters) if (!mainIds.has(character.memberId)) mainIds.set(character.memberId, character.id)
  const professionNamesById = Object.fromEntries(loaded.flatMap(character => character.professions.map(profession => [profession.id, profession.name])))
  const updatedAt = loaded.map(character => character.lastLoginAt).filter(Boolean).sort().at(-1) ?? null

  return buildResponse(
    { isDemo: false, isPreview: isPreview && loaded.length > 0, updatedAt, tracked: LIVE_TRACKED },
    events,
    members,
    characters,
    mainIds,
    { professions: professionNamesById, quests: questTitles, groups: quests.groupNames },
  )
})

interface LeaderboardEntry {
  name: string
  memberId: string | null
  characterId: string | null
  isMain: boolean
}

/** Charaktere mit Zustimmung zur Rangliste (siehe server/utils/leaderboard-consent.ts) */
async function optedInEntries(): Promise<LeaderboardEntry[]> {
  const consent = await consentedCharacters()
  if (!consent) return []
  return consent.characters
    .filter(character => consent.ids.has(character.id))
    .map(character => ({ name: character.name, memberId: character.memberId, characterId: character.id, isMain: character.isMain }))
}
