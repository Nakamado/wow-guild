import type { Dungeon, GroupRun } from '../types'
import { checkLevelFit } from './level'
import { isUpcoming } from './runs'

export interface DungeonFilter {
  /** Freitext: Name (DE/EN), Kürzel oder Zone */
  query?: string
  /** Nur Dungeons, deren empfohlener Bereich diese Stufe umfasst */
  level?: number | null
  /** Nur Dungeons, die ein Charakter dieser Stufe betreten kann und die empfohlen sind */
  characterLevel?: number | null
  /** Nur Dungeons mit geplanten, offenen Gruppen */
  onlyWithRuns?: boolean
}

const normalize = (value: string) =>
  value.toLocaleLowerCase('de-DE').normalize('NFD').replace(/\p{Diacritic}/gu, '')

export function filterDungeons(
  dungeons: readonly Dungeon[],
  filter: DungeonFilter,
  context: { runs?: readonly GroupRun[], now?: Date } = {},
): Dungeon[] {
  const query = filter.query?.trim() ? normalize(filter.query.trim()) : null
  const now = context.now ?? new Date()
  const slugsWithRuns = new Set(
    (context.runs ?? []).filter(run => isUpcoming(run, now)).map(run => run.dungeonSlug),
  )

  return dungeons.filter((dungeon) => {
    if (query) {
      const haystack = normalize([dungeon.name, dungeon.nameEn, dungeon.abbreviation, dungeon.zone].join(' '))
      if (!haystack.includes(query)) return false
    }
    if (filter.level != null) {
      if (filter.level < dungeon.levelRange.min || filter.level > dungeon.levelRange.max) return false
    }
    if (filter.characterLevel != null) {
      if (checkLevelFit(filter.characterLevel, dungeon).status !== 'fit') return false
    }
    if (filter.onlyWithRuns && !slugsWithRuns.has(dungeon.slug)) return false
    return true
  })
}
