import { toZonedParts } from './datetime'

/**
 * Kalenderhilfen. Rechnet mit reinen Kalenderdaten (YYYY-MM-DD), damit Tage unabhängig
 * von der Zeitzone des Geräts stimmen. Events werden ihrem Tag in Europe/Berlin zugeordnet.
 */

export interface CalendarDay {
  /** YYYY-MM-DD */
  key: string
  day: number
  inMonth: boolean
  isToday: boolean
  /** 0 = Montag … 6 = Sonntag */
  weekday: number
}

export interface MonthRef {
  year: number
  /** 1–12 */
  month: number
}

const pad = (value: number) => String(value).padStart(2, '0')

export function toDayKey(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`
}

/** Tag eines Zeitpunkts in Europe/Berlin (YYYY-MM-DD). */
export function dayKeyOf(iso: string | Date): string {
  return toZonedParts(iso).date
}

export function monthOf(iso: string | Date): MonthRef {
  const [year, month] = dayKeyOf(iso).split('-').map(Number)
  return { year: year!, month: month! }
}

/** „2026-11“ → { year: 2026, month: 11 }; ungültig → null */
export function parseMonthKey(value: unknown): MonthRef | null {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})$/.exec(value)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  return month >= 1 && month <= 12 && year >= 2000 && year <= 2100 ? { year, month } : null
}

export function monthKey({ year, month }: MonthRef): string {
  return `${year}-${pad(month)}`
}

export function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * 12 + (month - 1) + delta
  return { year: Math.floor(index / 12), month: (index % 12) + 1 }
}

/**
 * Monatsraster in ganzen Wochen (Montag bis Sonntag), inklusive der angrenzenden Tage
 * aus Vor- und Folgemonat.
 */
export function monthGrid(ref: MonthRef, todayKey: string): CalendarDay[][] {
  const first = Date.UTC(ref.year, ref.month - 1, 1)
  const offset = (new Date(first).getUTCDay() + 6) % 7 // Montag = 0
  const daysInMonth = new Date(Date.UTC(ref.year, ref.month, 0)).getUTCDate()
  const cells = Math.ceil((offset + daysInMonth) / 7) * 7

  const weeks: CalendarDay[][] = []
  for (let index = 0; index < cells; index++) {
    const date = new Date(first + (index - offset) * 86_400_000)
    const key = toDayKey(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())
    const day: CalendarDay = {
      key,
      day: date.getUTCDate(),
      inMonth: date.getUTCMonth() + 1 === ref.month,
      isToday: key === todayKey,
      weekday: index % 7,
    }
    if (index % 7 === 0) weeks.push([])
    weeks.at(-1)!.push(day)
  }
  return weeks
}

const monthLabelFormat = new Intl.DateTimeFormat('de-DE', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const dayLabelFormat = new Intl.DateTimeFormat('de-DE', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })

/** „November 2026“ */
export function formatMonthLabel({ year, month }: MonthRef): string {
  return monthLabelFormat.format(new Date(Date.UTC(year, month - 1, 1)))
}

/** „Donnerstag, 5. November“ für einen Tages-Schlüssel */
export function formatDayLabel(key: string): string {
  const [year, month, day] = key.split('-').map(Number)
  return dayLabelFormat.format(new Date(Date.UTC(year!, month! - 1, day!)))
}

export const WEEKDAY_LABELS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
