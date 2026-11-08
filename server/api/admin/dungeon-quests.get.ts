import { dungeonQuestGroups } from '#shared/data/dungeon-quests'

/**
 * Prüfansicht der Dungeon-Quest-Zuordnung (nur Gildenleitung): je Dungeon das Gebiet laut API und
 * die Zahl der gewerteten Quests je Fraktion. So fallen falsche Gebiets-IDs sofort auf.
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:tools')
  const blizzard = blizzardClient(event)
  if (!blizzard) throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Blizzard-API ist nicht eingerichtet (oder Demo-Modus).' })
  const { groups, areas } = await resolvedDungeonGroups(`static-forever-${blizzard.region}`)
  return {
    groups: dungeonQuestGroups.map((group) => {
      const resolved = groups.find(entry => entry.id === group.id)!
      const area = areas.get(group.id)
      return {
        id: group.id,
        name: group.name,
        source: group.quests ? 'manuell' as const : 'api' as const,
        areaId: group.areaId ?? null,
        apiAreaName: area?.name ?? null,
        areaQuestCount: area?.questIds.length ?? null,
        alliance: resolved.questIds.alliance.length,
        horde: resolved.questIds.horde.length,
      }
    }),
  }
})
