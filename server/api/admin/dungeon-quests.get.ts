import { dungeonQuestGroups, dungeonQuestTitles } from '#shared/data/dungeon-quests'

/**
 * Prüfansicht der Dungeon-Quests (nur Gildenleitung): je Dungeon die Zahl der Quests je Fraktion
 * laut Dungeon Journal und welche Quest-IDs die Blizzard-API (noch) nicht kennt. Eine unbekannte ID
 * heißt meist: Die Quest ist auf dem Server unter einer anderen ID angelegt – dann zählt sie nicht.
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:tools')
  const blizzard = blizzardClient(event)
  if (!blizzard) throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Blizzard-API ist nicht eingerichtet (oder Demo-Modus).' })
  const catalog = await catalogFor(dungeonQuestIds(), `static-forever-${blizzard.region}`)
  return {
    groups: dungeonQuestGroups.map((group) => {
      const ids = dungeonQuestIds([group])
      return {
        id: group.id,
        name: group.name,
        alliance: group.quests.alliance.length,
        horde: group.quests.horde.length,
        unknown: ids.filter(id => !catalog.has(id)).map(id => ({ id, title: dungeonQuestTitles[id] ?? null })),
      }
    }),
  }
})
