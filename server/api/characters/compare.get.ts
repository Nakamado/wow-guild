import { z } from 'zod'
import { pointsRules } from '../../../content/points'
import { createDemoProgress } from '../../../data/demo/progress'
import { characterSlug } from '../../providers/blizzard/progress'
import { explainScore, retroactiveEvents, scoreEvents } from '#shared/domain/points'
import { questEvents, type DungeonProgress } from '#shared/domain/quests'
import type { ProgressEvent, ProgressType } from '#shared/schemas/points'
import type { Character } from '#shared/types'

const QuerySchema = z.object({ a: z.string().min(1).max(64), b: z.string().min(1).max(64) })

export interface CompareSide {
  character: Character
  member: { id: string, displayName: string }
  /** null = Charakter nimmt nicht an der Rangliste teil (keine Zustimmung) */
  points: { total: number, byType: { type: ProgressType, count: number, points: number }[] } | null
  /** Quest-Fortschritt (nur mit Blizzard-Daten) */
  quests: { dungeonQuests: number, groupQuests: number, completeDungeons: number, dungeons: DungeonProgress[] } | null
}

/**
 * Zwei Gildencharaktere vergleichen (nur Gildenmitglieder, wie das Charakterprofil).
 * Punkte nur für Charaktere mit Zustimmung zur Rangliste – Stufe und Dungeon-Fortschritt stehen
 * ohnehin auf dem Profil.
 */
export default defineEventHandler(async (event): Promise<{ sides: [CompareSide, CompareSide] }> => {
  await requirePermission(event, 'members:view')
  const { a, b } = await getValidatedQuery(event, QuerySchema.parse)
  const demo = Boolean(useRuntimeConfig(event).public.demoMode)
  const providers = useProviders()

  const loaded = await Promise.all([a, b].map(async (id) => {
    const character = await providers.characters.get(id)
    const member = character ? await providers.members.getMember(character.memberId) : null
    if (!character || !member?.isGuildMember) {
      throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diesen Charakter gibt es nicht (mehr).' })
    }
    const [resolved] = await withGameData([character])
    return { character: resolved ?? character, member: { id: member.id, displayName: member.displayName } }
  }))

  const consent = demo ? null : await consentedCharacters().catch(() => null)
  const allowed = (id: string) => demo || (consent ? consent.ids.has(id) : false)
  const live = loaded.filter(entry => entry.character.source === 'blizzard')
  const quests = live.length
    ? await questProgressFor(live.map(entry => ({ name: entry.character.name, faction: entry.character.faction ?? null }))).catch(() => null)
    : null
  const demoEvents = demo ? createDemoProgress(await providers.characters.list(), pointsRules, new Date()) : []

  const sides = loaded.map(({ character, member }): CompareSide => {
    const progress = quests?.results.get(characterSlug(character.name))?.progress ?? null
    const owner = { memberId: character.memberId, characterId: character.id }
    const events: ProgressEvent[] = demo
      ? demoEvents.filter(entry => entry.characterId === character.id)
      : [...retroactiveEvents({ ...owner, level: character.level, professions: character.professions }, pointsRules), ...(progress ? questEvents(owner, progress) : [])]
    const score = scoreEvents(events, pointsRules)
    return {
      character,
      member,
      points: allowed(character.id)
        ? { total: score.total, byType: explainScore(score, entry => entry.objectId).map(line => ({ type: line.type, count: line.count, points: line.points })) }
        : null,
      quests: progress
        ? {
            dungeonQuests: progress.dungeonQuests.length,
            groupQuests: progress.groupQuests.length,
            completeDungeons: progress.dungeons.filter(entry => entry.complete).length,
            dungeons: progress.dungeons,
          }
        : null,
    }
  })
  return { sides: [sides[0]!, sides[1]!] }
})
