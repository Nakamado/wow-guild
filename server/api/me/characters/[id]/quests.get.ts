import { dungeonQuestGroups } from '#shared/data/dungeon-quests'
import type { DungeonQuestStatus } from '#shared/domain/quests'
import { characterSlug } from '../../../../providers/blizzard/progress'

/**
 * Quest-Fortschritt eines eigenen Charakters je Dungeon (für den Dungeon-Finder).
 * `dungeons` ist null, solange keine Blizzard-Daten vorliegen (Demo, Charakter nicht gefunden).
 * Dungeons ohne Quests für die Fraktion des Charakters fehlen in der Liste.
 */
export default defineEventHandler(async (event): Promise<{ dungeons: Record<string, DungeonQuestStatus> | null }> => {
  const viewer = await requirePermission(event, 'runs:join')
  const character = await loadOwnCharacter(event, viewer.memberId ?? '')
  const [resolved] = await withGameData([character])
  if (!resolved || resolved.source !== 'blizzard') return { dungeons: null }

  const quests = await questProgressFor([{ name: resolved.name, faction: resolved.faction ?? null }]).catch(() => null)
  const progress = quests?.results.get(characterSlug(resolved.name))?.progress
  if (!progress) return { dungeons: null }

  const dungeons: Record<string, DungeonQuestStatus> = {}
  for (const entry of progress.dungeons) {
    const group = dungeonQuestGroups.find(candidate => candidate.id === entry.groupId)
    for (const slug of group?.dungeonSlugs ?? []) {
      dungeons[slug] = { done: entry.done, total: entry.total, complete: entry.complete, missing: entry.missing }
    }
  }
  return { dungeons }
})
