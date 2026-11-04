import type { Dungeon } from '../types'

export type LevelFitStatus = 'fit' | 'below-minimum' | 'below-recommended' | 'above-recommended'

export interface LevelFit {
  status: LevelFitStatus
  /** true = Teilnahme nicht möglich (Mindeststufe nicht erreicht) */
  blocking: boolean
  message: string
}

/**
 * Vergleicht eine Charakterstufe mit dem Dungeon.
 * - unter der Mindeststufe → blockiert
 * - unter/über dem empfohlenen Bereich → erlaubt, aber mit Hinweis
 */
export function checkLevelFit(level: number, dungeon: Pick<Dungeon, 'levelRange' | 'minLevel' | 'name'>): LevelFit {
  const { min, max } = dungeon.levelRange

  if (dungeon.minLevel !== null && level < dungeon.minLevel) {
    return {
      status: 'below-minimum',
      blocking: true,
      message: `Für ${dungeon.name} ist mindestens Stufe ${dungeon.minLevel} nötig (aktuell ${level}).`,
    }
  }
  if (level < min) {
    return {
      status: 'below-recommended',
      blocking: false,
      message: `Empfohlen ist Stufe ${formatRange(min, max)} – mit Stufe ${level} wird es fordernd.`,
    }
  }
  if (level > max) {
    return {
      status: 'above-recommended',
      blocking: false,
      message: `Mit Stufe ${level} liegst du über dem empfohlenen Bereich (${formatRange(min, max)}) – ideal zum Helfen, aber kaum Erfahrung.`,
    }
  }
  return { status: 'fit', blocking: false, message: `Passt: empfohlen ist Stufe ${formatRange(min, max)}.` }
}

export function formatRange(min: number, max: number): string {
  return min === max ? String(min) : `${min}–${max}`
}
