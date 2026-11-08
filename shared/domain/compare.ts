import type { ProgressType } from '../schemas/points'

/** Vergleich in der Rangliste: höchstens so viele Einträge nebeneinander */
export const MAX_COMPARE = 4

/**
 * Bestwert einer Zeile: welche Einträge vorn liegen und wie weit die anderen zurückliegen.
 * `gap[i]` = Abstand zum Bestwert (0 beim Besten, null ohne Wert). Alle gleich → keiner ist „vorn“.
 */
export function standings(values: readonly (number | null | undefined)[], lowerIsBetter = false) {
  const known = values.filter((value): value is number => value != null)
  const best = known.length ? (lowerIsBetter ? Math.min(...known) : Math.max(...known)) : null
  const allEqual = known.length === values.length && known.every(value => value === known[0])
  return values.map(value => ({
    best: best !== null && value === best && !allEqual && known.length > 1,
    gap: value == null || best === null ? null : Math.abs(best - value),
  }))
}

export interface PointsLine { type: ProgressType, count: number, points: number }

/** Punkte-Zeilen mehrerer Einträge in fester Reihenfolge zusammenführen (fehlender Typ = 0) */
export function mergePointLines(order: readonly ProgressType[], lists: readonly (readonly PointsLine[])[]) {
  const types = order.filter(type => lists.some(lines => lines.some(line => line.type === type)))
  return types.map(type => ({
    type,
    entries: lists.map(lines => lines.find(line => line.type === type) ?? { type, count: 0, points: 0 }),
  }))
}
