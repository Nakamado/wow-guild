/**
 * Zeitdarstellung: Speicherung immer als UTC (ISO 8601), Anzeige immer in Europe/Berlin.
 * Wird von Nuxt in app/ und server/ automatisch importiert.
 */
export const DISPLAY_TIME_ZONE = 'Europe/Berlin'
export const DISPLAY_LOCALE = 'de-DE'

const dateTimeFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

const dateFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const timeFormat = new Intl.DateTimeFormat(DISPLAY_LOCALE, {
  timeZone: DISPLAY_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
})

/** z. B. „Mi., 04.11.2026, 19:00“ */
export function formatDateTime(iso: string | Date): string {
  return dateTimeFormat.format(new Date(iso))
}

/** z. B. „04.11.2026“ */
export function formatDate(iso: string | Date): string {
  return dateFormat.format(new Date(iso))
}

/** z. B. „19:00“ */
export function formatTime(iso: string | Date): string {
  return timeFormat.format(new Date(iso))
}
