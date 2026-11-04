import { describe, expect, it } from 'vitest'
import {
  dayKeyOf,
  formatDayLabel,
  formatMonthLabel,
  monthGrid,
  parseMonthKey,
  shiftMonth,
} from '../../shared/utils/calendar'

describe('Monatsraster', () => {
  it('beginnt am Montag und enthält ganze Wochen', () => {
    const weeks = monthGrid({ year: 2026, month: 11 }, '2026-11-04')
    // 1. November 2026 ist ein Sonntag → erste Woche beginnt am 26. Oktober
    expect(weeks[0]![0]).toMatchObject({ key: '2026-10-26', inMonth: false, weekday: 0 })
    expect(weeks[0]![6]).toMatchObject({ key: '2026-11-01', inMonth: true, weekday: 6 })
    expect(weeks.every(week => week.length === 7)).toBe(true)
    expect(weeks.flat().filter(day => day.inMonth)).toHaveLength(30)
    expect(weeks.flat().find(day => day.isToday)?.key).toBe('2026-11-04')
  })

  it('kommt mit Februar und Jahreswechsel zurecht', () => {
    expect(monthGrid({ year: 2028, month: 2 }, '').flat().filter(day => day.inMonth)).toHaveLength(29)
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
  })
})

describe('Tageszuordnung', () => {
  it('ordnet Events ihrem Tag in Berlin zu, nicht dem UTC-Tag', () => {
    // 23:30 UTC am 4.11. ist 00:30 Uhr am 5.11. in Berlin
    expect(dayKeyOf('2026-11-04T23:30:00Z')).toBe('2026-11-05')
    expect(dayKeyOf('2026-07-01T21:59:00Z')).toBe('2026-07-01')
    expect(dayKeyOf('2026-07-01T22:00:00Z')).toBe('2026-07-02')
  })
})

describe('Monatsschlüssel und Beschriftungen', () => {
  it('liest nur gültige Monatsschlüssel', () => {
    expect(parseMonthKey('2026-11')).toEqual({ year: 2026, month: 11 })
    expect(parseMonthKey('2026-13')).toBeNull()
    expect(parseMonthKey('november')).toBeNull()
    expect(parseMonthKey(undefined)).toBeNull()
  })

  it('formatiert auf Deutsch', () => {
    expect(formatMonthLabel({ year: 2026, month: 11 })).toBe('November 2026')
    expect(formatDayLabel('2026-11-05')).toBe('Donnerstag, 5. November')
  })
})
