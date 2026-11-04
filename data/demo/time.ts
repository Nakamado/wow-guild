/**
 * Zeitpunkt `days` Tage nach dem heutigen UTC-Tag um `hourUtc` Uhr (UTC).
 * 18 Uhr UTC = 19 Uhr MEZ / 20 Uhr MESZ.
 */
export function at(now: Date, days: number, hourUtc: number): string {
  const day = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  return new Date(day + days * 86_400_000 + hourUtc * 3_600_000).toISOString()
}
