/**
 * Fehler aus Schreibzugriffen mit fachlichem Code. Die Texte entsprechen denen der
 * Domain-Logik, damit Demo und Live gleich klingen.
 */
const messages: Record<string, { status: number, message: string }> = {
  'run-not-found': { status: 404, message: 'Diese Gruppe gibt es nicht (mehr).' },
  'run-not-open': { status: 409, message: 'Dieser Run ist nicht mehr offen.' },
  'run-started': { status: 409, message: 'Dieser Run hat bereits begonnen.' },
  'character-not-owned': { status: 403, message: 'Dieser Charakter gehört nicht zu deinem Profil.' },
  'already-joined': { status: 409, message: 'Du bist bereits für diesen Run angemeldet.' },
  'character-already-joined': { status: 409, message: 'Dieser Charakter ist bereits für diesen Run angemeldet.' },
  'role-not-supported': { status: 422, message: 'Diese Rolle gibt es in diesem Run nicht.' },
  'role-full': { status: 409, message: 'Alle Plätze für diese Rolle sind gerade belegt worden.' },
  'not-joined': { status: 409, message: 'Du bist für diesen Run nicht angemeldet.' },
  'not-found': { status: 404, message: 'Nicht gefunden.' },
  'name-taken': { status: 409, message: 'Diesen Charakternamen gibt es auf dem Realm bereits.' },
  'already-granted': { status: 409, message: 'Für diesen Charakter gibt es bereits eine aktive Freigabe.' },
  'has-signups': { status: 409, message: 'Dieser Charakter ist noch für Runs angemeldet. Melde ihn zuerst ab.' },
}

export class RepositoryError extends Error {
  readonly status: number
  constructor(readonly code: string, message?: string) {
    const known = messages[code]
    super(message ?? known?.message ?? 'Das hat leider nicht geklappt. Bitte versuche es später erneut.')
    this.name = 'RepositoryError'
    this.status = known?.status ?? 500
  }
}

/** Postgres-/PostgREST-Fehler in fachliche Codes übersetzen */
export function fromPostgresError(error: { code?: string, message?: string }): RepositoryError {
  // Eigene Ausnahmen aus join_run()/leave_run(): Code steht im Meldungstext
  if (error.code === 'P0001' && error.message && error.message in messages) return new RepositoryError(error.message)
  if (error.code === '23505') return new RepositoryError('name-taken')
  if (error.code === 'PGRST116') return new RepositoryError('not-found')
  console.error(`[supabase] ${error.code ?? 'unbekannt'}: ${error.message ?? ''}`)
  return new RepositoryError('unknown')
}
