import type { DomainError } from '#shared/domain/result'
import { RepositoryError } from '../repositories/errors'

/** Fachlicher Fehler → HTTP-Fehler mit Code (für die UI) */
export function rejectWith(error: DomainError, statusCode = 422): never {
  throw createError({ statusCode, statusMessage: 'Unprocessable Entity', message: error.message, data: { code: error.code } })
}

/** Datenbankfehler (Codes aus join_run() usw.) als verständliche HTTP-Fehler weitergeben */
export async function persist<T>(action: () => Promise<T>): Promise<T> {
  try {
    return await action()
  }
  catch (error) {
    if (error instanceof RepositoryError) {
      throw createError({ statusCode: error.status, statusMessage: error.name, message: error.message, data: { code: error.code } })
    }
    throw error
  }
}

/** Schreibende Anfragen nur von der eigenen Seite (zusätzlich zu SameSite-Cookies) */
export function assertSameOrigin(event: Parameters<typeof getRequestHeader>[0]) {
  const origin = getRequestHeader(event, 'origin')
  if (!origin) return
  const host = getRequestHeader(event, 'x-forwarded-host') ?? getRequestHeader(event, 'host')
  if (host && new URL(origin).host !== host) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden', message: 'Ungültige Herkunft der Anfrage.' })
  }
}

/** Gemeinsamer Auftakt aller Schreib-Endpunkte: Herkunft, Live-Speicher, Berechtigung */
export async function beginWrite(event: Parameters<typeof getViewer>[0]) {
  assertSameOrigin(event)
  const writers = useWriters()
  const viewer = await getViewer(event)
  if (viewer.level === 'visitor' || !viewer.memberId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Bitte melde dich mit Discord an.' })
  }
  return { writers, viewer: viewer as typeof viewer & { memberId: string } }
}
