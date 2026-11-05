import { createError } from 'h3'

/**
 * Schutz vor Ausfällen externer Dienste (Twitch, Discord): Statt eines Fehlers 500
 * liefert die Seite einen sinnvollen Ersatz (z. B. „offline“, leere Liste) und
 * fragt den Dienst nach einem Fehler erst nach einer Pause erneut an –
 * so werden falsche Zugangsdaten nicht bei jedem Seitenaufruf neu probiert und das Log bleibt lesbar.
 */
export interface FallbackOptions<T> {
  /** Name für das Log, z. B. „twitch.clips“ */
  label: string
  /** Ersatzwert; eine Funktion, die wirft, lässt den Fehler gezielt durch (z. B. 503) */
  fallback: () => T
  /** Pause nach einem Fehler (ms) */
  cooldownMs?: number
  now?: () => number
  log?: (message: string) => void
}

export function withFallback<A extends unknown[], T>(
  action: (...args: A) => Promise<T>,
  options: FallbackOptions<T>,
): (...args: A) => Promise<T> {
  const cooldown = options.cooldownMs ?? 60_000
  const now = options.now ?? Date.now
  const log = options.log ?? (message => console.warn(message))
  let blockedUntil = 0

  return async (...args: A) => {
    if (now() < blockedUntil) return options.fallback()
    try {
      return await action(...args)
    }
    catch (error) {
      blockedUntil = now() + cooldown
      const reason = error instanceof Error ? error.message : 'unbekannter Fehler'
      log(`[${options.label}] nicht erreichbar (${reason}) – Ersatzdaten für ${Math.round(cooldown / 1000)} s`)
      return options.fallback()
    }
  }
}

/** Ersatz, der als verständlicher HTTP-Fehler bei der Seite ankommt */
export function serviceUnavailable(message: string): never {
  throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message })
}
