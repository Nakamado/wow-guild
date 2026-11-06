import { dayKeyOf } from '../utils/calendar'
import type { BoardNote, BoardNoteInput } from '../types'
import { fail, ok, type DomainResult } from './result'

/**
 * Sichtbare Aushänge: nicht abgelaufen (Ablauftag zählt noch mit, Berliner Zeit), neueste zuerst.
 * Ist nichts mehr aktiv, blendet die Startseite das Brett aus.
 */
export function activeBoardNotes<T extends Pick<BoardNote, 'expiresOn' | 'createdAt'>>(notes: readonly T[], now: Date): T[] {
  const today = dayKeyOf(now)
  return notes
    .filter(note => note.expiresOn === null || note.expiresOn >= today)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

/** Fachliche Prüfung vor dem Speichern (gleiche Regel in Demo und live) */
export function checkBoardInput(input: BoardNoteInput, now: Date): DomainResult<BoardNoteInput, 'expired'> {
  if (input.expiresOn && input.expiresOn < dayKeyOf(now)) {
    return fail('expired', 'Das Ablaufdatum liegt in der Vergangenheit.')
  }
  return ok(input)
}
