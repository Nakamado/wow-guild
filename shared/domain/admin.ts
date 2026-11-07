import type { LeaderboardGrant } from '../schemas/admin'
import { fail, ok, type DomainResult } from './result'

/** Stand der Datenschutzerklärung, den Mitglieder einmal bestätigen (bei Änderungen erhöhen) */
export const PRIVACY_NOTICE_VERSION = 1

/** Verständliche Bezeichnungen der protokollierten Aktionen */
export const activityLabels: Record<string, string> = {
  'account.registered': 'Konto registriert',
  'account.deleted': 'Konto gelöscht',
  'character.added': 'Charakter hinzugefügt',
  'character.removed': 'Charakter entfernt',
  'character.renamed': 'Charakter umbenannt',
  'leaderboard.opted-in': 'Ranglistenteilnahme erteilt',
  'leaderboard.opted-out': 'Ranglistenteilnahme widerrufen',
  'leaderboard.granted': 'Ranglistenfreigabe durch Admin',
  'leaderboard.revoked': 'Ranglistenfreigabe zurückgezogen',
  'leaderboard.evidence-deleted': 'Nachweis gelöscht',
  'role.promoted': 'Zum Admin ernannt',
  'role.demoted': 'Zum Mitglied zurückgestuft',
}

/** Löschdatum eines Protokolleintrags */
export function retainUntil(now: Date, days: number): Date {
  return new Date(now.getTime() + Math.max(1, Math.floor(days)) * 86_400_000)
}

/**
 * Darf `actorLevel` die Webseitenrolle von `targetId` ändern?
 * Nur der Hauptadmin; nie sich selbst und nie den Hauptadmin (der steht in der Konfiguration).
 */
export function checkRoleChange(input: {
  actorLevel: string
  actorId: string | null
  targetId: string
  superadminId: string | null
  targetExists: boolean
}): DomainResult<true> {
  if (input.actorLevel !== 'superadmin') return fail('forbidden', 'Nur der Hauptadmin kann Admins ernennen oder zurückstufen.')
  if (input.superadminId && input.targetId === input.superadminId) return fail('superadmin-fixed', 'Die Rolle des Hauptadmins lässt sich hier nicht ändern.')
  if (input.actorId && input.targetId === input.actorId) return fail('self-change', 'Die eigene Rolle lässt sich nicht ändern.')
  if (!input.targetExists) return fail('not-found', 'Dieses Mitglied gibt es nicht (mehr).')
  return ok(true)
}

/**
 * Darf eine Adminfreigabe angelegt werden?
 * - Der Charakter muss dem Mitglied gehören.
 * - Zustimmung nicht in der Zukunft und – nach einem Widerruf – nicht davor (dann braucht es eine neue).
 * - Je Charakter höchstens eine aktive Freigabe.
 */
export function checkGrant(input: {
  consentDate: string
  today: string
  characterOwnerId: string | null
  memberId: string
  /** Tag des letzten Widerrufs (Europe/Berlin, YYYY-MM-DD) */
  revokedOn: string | null
  activeGrantExists: boolean
}): DomainResult<true> {
  if (input.characterOwnerId !== input.memberId) return fail('character-mismatch', 'Dieser Charakter gehört nicht zum gewählten Mitglied.')
  if (input.consentDate > input.today) return fail('consent-in-future', 'Das Datum der Zustimmung darf nicht in der Zukunft liegen.')
  if (input.revokedOn && input.consentDate < input.revokedOn) {
    return fail('consent-before-revocation', 'Das Mitglied hat die Teilnahme danach widerrufen. Für eine neue Freigabe braucht es eine neue Zustimmung (Datum ab dem Widerruf).')
  }
  if (input.activeGrantExists) return fail('already-granted', 'Für diesen Charakter gibt es bereits eine aktive Freigabe.')
  return ok(true)
}

/**
 * Welche Charaktere erscheinen in der Rangliste?
 * Selbstfreigabe des Mitglieds = alle seine Charaktere in der Gilde; Adminfreigabe = nur genau dieser Charakter.
 */
export function leaderboardCharacterIds(input: {
  characters: readonly { id: string, memberId: string, inGuild: boolean }[]
  optedInMemberIds: ReadonlySet<string>
  grants: readonly Pick<LeaderboardGrant, 'characterId' | 'memberId' | 'revokedAt'>[]
}): Set<string> {
  const granted = new Set(input.grants.filter(grant => !grant.revokedAt).map(grant => `${grant.memberId}:${grant.characterId}`))
  return new Set(input.characters
    .filter(character => character.inGuild)
    .filter(character => input.optedInMemberIds.has(character.memberId) || granted.has(`${character.memberId}:${character.id}`))
    .map(character => character.id))
}

/** Erlaubte Nachweisbilder: Typ anhand der ersten Bytes, nicht anhand des Dateinamens */
export const MAX_EVIDENCE_BYTES = 3 * 1024 * 1024

export function detectImageType(bytes: Uint8Array): 'png' | 'jpg' | 'webp' | null {
  const starts = (...values: number[]) => values.every((value, index) => bytes[index] === value)
  if (starts(0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return 'png'
  if (starts(0xFF, 0xD8, 0xFF)) return 'jpg'
  if (starts(0x52, 0x49, 0x46, 0x46) && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) return 'webp'
  return null
}

export const imageContentTypes = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp' } as const
