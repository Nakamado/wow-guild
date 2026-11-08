import { describe, expect, it } from 'vitest'
import { difference, mergeDungeons, mergePointLines } from '../../shared/domain/compare'

describe('Charaktervergleich', () => {
  it('ermittelt, wer vorn liegt', () => {
    expect(difference(300, 150)).toEqual({ leader: 'a', amount: 150 })
    expect(difference(20, 25)).toEqual({ leader: 'b', amount: 5 })
    expect(difference(7, 7)).toEqual({ leader: null, amount: 0 })
    expect(difference(null, 7)).toBeNull()
  })

  it('führt Punkte-Zeilen in Regel-Reihenfolge zusammen', () => {
    const rows = mergePointLines(['level', 'dungeon-quest', 'group-quest'], [{ type: 'dungeon-quest', count: 2, points: 150 }, { type: 'level', count: 19, points: 190 }], [{ type: 'level', count: 9, points: 90 }])
    expect(rows.map(row => row.type)).toEqual(['level', 'dungeon-quest'])
    expect(rows[1]).toEqual({ type: 'dungeon-quest', a: { type: 'dungeon-quest', count: 2, points: 150 }, b: { type: 'dungeon-quest', count: 0, points: 0 } })
    // ohne Zustimmung keine Punkte – bleibt null statt 0
    expect(mergePointLines(['level'], [{ type: 'level', count: 1, points: 10 }], null)[0]!.b).toBeNull()
  })

  it('zeigt nur Dungeons, in denen einer schon Quests erledigt hat', () => {
    const dm = { groupId: 'the-deadmines', name: 'Die Todesminen', total: 7, complete: false }
    const rows = mergeDungeons([{ ...dm, done: 6 }, { groupId: 'x', name: 'X', done: 0, total: 3, complete: false }], [{ ...dm, done: 0 }])
    expect(rows).toEqual([{ groupId: 'the-deadmines', name: 'Die Todesminen', a: { ...dm, done: 6 }, b: { ...dm, done: 0 } }])
  })
})
