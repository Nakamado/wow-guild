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

const partsFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: DISPLAY_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** Datum und Uhrzeit in Europe/Berlin als Formularwerte („2026-11-05“, „19:00“). */
export function toZonedParts(iso: string | Date): { date: string, time: string } {
  const parts = Object.fromEntries(partsFormat.formatToParts(new Date(iso)).map(part => [part.type, part.value]))
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

/**
 * Wandelt eine in Europe/Berlin eingegebene Ortszeit in einen UTC-Zeitpunkt (ISO) um –
 * inklusive Sommer-/Winterzeit. Gibt `null` bei ungültiger oder nicht existierender Ortszeit zurück.
 */
export function zonedToIso(date: string, time: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!match || !timeMatch) return null

  const [, y, mo, d] = match.map(Number)
  const [, h, mi] = timeMatch.map(Number)
  // Erste Schätzung: als UTC interpretieren, dann um den Zeitzonen-Versatz korrigieren (zweimal für DST-Grenzen)
  let utc = Date.UTC(y!, mo! - 1, d!, h!, mi!)
  for (let pass = 0; pass < 2; pass++) {
    const shown = toZonedParts(new Date(utc))
    const [sy, smo, sd] = shown.date.split('-').map(Number)
    const [sh, smi] = shown.time.split(':').map(Number)
    const diff = Date.UTC(y!, mo! - 1, d!, h!, mi!) - Date.UTC(sy!, smo! - 1, sd!, sh!, smi!)
    utc += diff
  }
  const result = new Date(utc)
  if (Number.isNaN(result.getTime())) return null
  // Rückrechnung muss exakt die Eingabe ergeben – fängt ungültige Daten (31.02.) und
  // nicht existierende Uhrzeiten bei der Zeitumstellung ab
  const check = toZonedParts(result)
  return check.date === date && check.time === time ? result.toISOString() : null
}
