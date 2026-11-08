import { describe, expect, it } from 'vitest'
import { mergePointLines, standings } from '../../shared/domain/compare'

describe('Vergleich in der Rangliste', () => {
  it('markiert den Bestwert und den Abstand der anderen', () => {
    expect(standings([300, 150, 225])).toEqual([{ best: true, gap: 0 }, { best: false, gap: 150 }, { best: false, gap: 75 }])
    // Platz: kleiner ist besser
    expect(standings([3, 1], true)).toEqual([{ best: false, gap: 2 }, { best: true, gap: 0 }])
    // alle gleich → niemand vorn
    expect(standings([60, 60, 60]).some(entry => entry.best)).toBe(false)
    // fehlender Wert
    expect(standings([null, 7])[0]).toEqual({ best: false, gap: null })
  })

  it('führt Punkte-Zeilen in Regel-Reihenfolge zusammen', () => {
    const rows = mergePointLines(['level', 'dungeon-quest', 'group-quest'], [
      [{ type: 'dungeon-quest', count: 2, points: 150 }, { type: 'level', count: 19, points: 190 }],
      [{ type: 'level', count: 9, points: 90 }],
      [],
    ])
    expect(rows.map(row => row.type)).toEqual(['level', 'dungeon-quest'])
    expect(rows[1]!.entries.map(entry => entry.points)).toEqual([150, 0, 0])
  })
})
