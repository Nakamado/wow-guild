import type { ProgressType } from '../schemas/points'

/** Unterschied zweier Werte: wer liegt vorn und um wie viel (null = nicht vergleichbar) */
export function difference(a: number | null | undefined, b: number | null | undefined): { leader: 'a' | 'b' | null, amount: number } | null {
  if (a == null || b == null) return null
  if (a === b) return { leader: null, amount: 0 }
  return a > b ? { leader: 'a', amount: a - b } : { leader: 'b', amount: b - a }
}

export interface PointsLine { type: ProgressType, count: number, points: number }

/** Punkte-Zeilen beider Charaktere in fester Reihenfolge zusammenführen (fehlender Typ = 0) */
export function mergePointLines(order: readonly ProgressType[], a: readonly PointsLine[] | null, b: readonly PointsLine[] | null) {
  const types = order.filter(type => a?.some(line => line.type === type) || b?.some(line => line.type === type))
  const find = (lines: readonly PointsLine[] | null, type: ProgressType) =>
    lines ? lines.find(line => line.type === type) ?? { type, count: 0, points: 0 } : null
  return types.map(type => ({ type, a: find(a, type), b: find(b, type) }))
}

export interface DungeonStand { groupId: string, name: string, done: number, total: number, complete: boolean }

/** Dungeons, in denen mindestens einer der beiden schon Quests erledigt hat */
export function mergeDungeons(a: readonly DungeonStand[] | null, b: readonly DungeonStand[] | null) {
  const ids = [...new Set([...(a ?? []), ...(b ?? [])].filter(entry => entry.done > 0).map(entry => entry.groupId))]
  return ids.map((groupId) => {
    const left = a?.find(entry => entry.groupId === groupId) ?? null
    const right = b?.find(entry => entry.groupId === groupId) ?? null
    return { groupId, name: (left ?? right)!.name, a: left, b: right }
  })
}
