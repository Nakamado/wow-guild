import { dungeons } from '../../shared/data/dungeons'
import { retroactiveEvents } from '../../shared/domain/points'
import type { PointsRules, ProgressEvent } from '../../shared/schemas/points'
import type { Character } from '../../shared/types'

const PROFESSIONS = ['alchemy', 'blacksmithing', 'enchanting', 'herbalism', 'mining', 'tailoring']

/**
 * FIKTIVE Fortschritte für die Demo-Rangliste – deterministisch aus den Demo-Charakteren erzeugt
 * (gleiche Eingabe → gleiche Punkte), damit Tests und Screenshots stabil bleiben.
 */
export function createDemoProgress(characters: readonly Character[], rules: PointsRules, now: Date): ProgressEvent[] {
  const events: ProgressEvent[] = []
  const day = 86_400_000
  const eligible = dungeons.filter(dungeon => dungeon.levelRange.min <= 60)

  characters.forEach((character, index) => {
    const base = { memberId: character.memberId, characterId: character.id }
    const professions = [
      { id: PROFESSIONS[index % PROFESSIONS.length]!, skill: Math.min(300, character.level * 5 - (index % 3) * 20) },
    ]
    events.push(...retroactiveEvents({ ...base, level: character.level, professions }, rules))

    // Dungeons passend zur Stufe, verteilt über die letzten zwei Wochen
    const fitting = eligible.filter(dungeon => dungeon.levelRange.min <= character.level)
    const runs = fitting.length ? (index * 7) % 9 : 0
    for (let run = 0; run < runs; run++) {
      const dungeon = fitting[(index + run) % fitting.length]!
      const occurredAt = new Date(now.getTime() - ((run * 37 + index * 11) % 14) * day - 3_600_000).toISOString()
      events.push({ ...base, type: 'dungeon-first', objectId: dungeon.slug, occurredAt })
      events.push({ ...base, type: 'dungeon-complete', objectId: `${dungeon.slug}:${run}`, occurredAt })
      for (let boss = 0; boss < 3; boss++) events.push({ ...base, type: 'dungeon-boss', objectId: `${dungeon.slug}:${run}:${boss}`, occurredAt })
      if (run % 2 === 0) events.push({ ...base, type: 'dungeon-quest', objectId: `${dungeon.slug}-quest-${run}`, occurredAt })
    }
  })
  return events
}
