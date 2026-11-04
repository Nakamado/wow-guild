import { getRole } from '../data/roles'
import type { Character, CommunityMember, Dungeon, GroupRun, Participant, RoleCapacity, RoleId } from '../types'
import { canPlayRole, defaultCatalog, type GameCatalog } from './characters'
import { computeComposition, totalCapacity } from './composition'
import { checkLevelFit } from './level'
import { fail, ok, type DomainResult } from './result'

/**
 * Geschäftsregeln für Dungeon- und Raid-Runs.
 *
 * Alle Funktionen sind rein: Sie bekommen einen Snapshot und liefern einen neuen Run zurück.
 * Schutz vor Überbuchung bei GLEICHZEITIGEN Anmeldungen ist Aufgabe der Persistenz:
 * Das Repository muss Lesen + Prüfen + Schreiben atomar ausführen
 * (Supabase: Postgres-Funktion `join_run()` mit `SELECT … FOR UPDATE`, siehe docs/PLAN.md).
 */

export type JoinErrorCode
  = | 'run-not-open'
    | 'run-started'
    | 'not-guild-member'
    | 'character-not-owned'
    | 'already-joined'
    | 'character-already-joined'
    | 'role-not-supported-by-class'
    | 'role-not-chosen'
    | 'below-minimum-level'
    | 'role-full'

export interface JoinInput {
  run: GroupRun
  dungeon: Dungeon
  member: Pick<CommunityMember, 'id' | 'isGuildMember'>
  character: Character
  role: RoleId
  now: Date
  catalog?: GameCatalog
}

export interface JoinCheck {
  /** `participant` = fester Platz, `waitlist` = Rolle voll, Warteliste aktiv */
  placement: 'participant' | 'waitlist'
  /** Nicht-blockierende Hinweise, z. B. zum Levelbereich */
  warnings: string[]
}

/** Prüft, ob ein Mitglied mit Charakter und Rolle einem Run beitreten darf. */
export function canJoinRun(input: JoinInput): DomainResult<JoinCheck, JoinErrorCode> {
  const { run, dungeon, member, character, role, now } = input
  const catalog = input.catalog ?? defaultCatalog

  if (run.status !== 'open') {
    return fail('run-not-open', run.status === 'cancelled' ? 'Dieser Run wurde abgesagt.' : 'Dieser Run ist bereits abgeschlossen.')
  }
  if (new Date(run.startsAt).getTime() <= now.getTime()) {
    return fail('run-started', 'Dieser Run hat bereits begonnen.')
  }
  if (!member.isGuildMember) {
    return fail('not-guild-member', 'Nur Gildenmitglieder können Gruppen beitreten.')
  }
  if (character.memberId !== member.id) {
    return fail('character-not-owned', 'Dieser Charakter gehört nicht zu deinem Profil.')
  }

  const everyone = [...run.participants, ...run.waitlist]
  if (everyone.some(participant => participant.memberId === member.id)) {
    return fail('already-joined', 'Du bist bereits für diesen Run angemeldet.')
  }
  if (everyone.some(participant => participant.characterId === character.id)) {
    return fail('character-already-joined', `${character.name} ist bereits für diesen Run angemeldet.`)
  }

  const roleCheck = canPlayRole(character, role, catalog)
  if (!roleCheck.ok) return roleCheck

  const levelFit = checkLevelFit(character.level, dungeon)
  if (levelFit.blocking) return fail('below-minimum-level', levelFit.message)
  const warnings = levelFit.status === 'fit' ? [] : [levelFit.message]

  const slot = computeComposition(run).slots.find(entry => entry.role === role)
  if (!slot || slot.open === 0) {
    if (run.waitlistEnabled) {
      return ok({ placement: 'waitlist', warnings: [...warnings, `Alle ${getRole(role).name}-Plätze sind belegt – du kommst auf die Warteliste.`] })
    }
    return fail('role-full', `Alle Plätze für ${getRole(role).name} sind bereits belegt.`)
  }

  return ok({ placement: 'participant', warnings })
}

/** Führt die Anmeldung aus (nach erfolgreicher Prüfung). */
export function joinRun(input: JoinInput): DomainResult<{ run: GroupRun, check: JoinCheck }, JoinErrorCode> {
  const check = canJoinRun(input)
  if (!check.ok) return check

  const participant: Participant = {
    memberId: input.member.id,
    characterId: input.character.id,
    role: input.role,
    joinedAt: input.now.toISOString(),
  }
  const run: GroupRun = check.value.placement === 'participant'
    ? { ...input.run, participants: [...input.run.participants, participant], updatedAt: participant.joinedAt }
    : { ...input.run, waitlist: [...input.run.waitlist, participant], updatedAt: participant.joinedAt }

  return ok({ run, check: check.value })
}

export type LeaveErrorCode = 'not-joined' | 'run-not-open'

/**
 * Meldet ein Mitglied ab. Wird ein fester Platz frei, rückt der/die Erste
 * mit derselben Rolle von der Warteliste nach.
 */
export function leaveRun(
  run: GroupRun,
  memberId: string,
  now: Date,
): DomainResult<{ run: GroupRun, promoted: Participant | null }, LeaveErrorCode> {
  if (run.status !== 'open') return fail('run-not-open', 'Von abgesagten oder abgeschlossenen Runs kann man sich nicht abmelden.')

  const participant = run.participants.find(entry => entry.memberId === memberId)
  const onWaitlist = run.waitlist.some(entry => entry.memberId === memberId)
  if (!participant && !onWaitlist) return fail('not-joined', 'Du bist für diesen Run nicht angemeldet.')

  const updatedAt = now.toISOString()
  if (!participant) {
    return ok({ run: { ...run, waitlist: run.waitlist.filter(entry => entry.memberId !== memberId), updatedAt }, promoted: null })
  }

  const participants = run.participants.filter(entry => entry.memberId !== memberId)
  const promoted = run.waitlist.find(entry => entry.role === participant.role) ?? null
  const waitlist = promoted ? run.waitlist.filter(entry => entry !== promoted) : run.waitlist

  return ok({
    run: { ...run, participants: promoted ? [...participants, promoted] : participants, waitlist, updatedAt },
    promoted,
  })
}

export type RunValidationCode
  = | 'starts-in-past'
    | 'capacity-empty'
    | 'capacity-exceeds-group-size'
    | 'description-too-long'
    | 'capacity-below-participants'

export interface RunDraft {
  startsAt: string
  capacity: RoleCapacity
  description: string
}

/** Prüft Eingaben beim Erstellen oder Bearbeiten eines Runs. */
export function validateRunDraft(
  draft: RunDraft,
  dungeon: Pick<Dungeon, 'groupSize' | 'name'>,
  now: Date,
  existing?: Pick<GroupRun, 'participants'>,
): DomainResult<RunDraft, RunValidationCode> {
  if (new Date(draft.startsAt).getTime() <= now.getTime()) {
    return fail('starts-in-past', 'Der Termin muss in der Zukunft liegen.')
  }
  const size = totalCapacity(draft.capacity)
  if (size < 1) return fail('capacity-empty', 'Mindestens ein Platz muss vergeben werden.')
  if (size > dungeon.groupSize) {
    return fail('capacity-exceeds-group-size', `${dungeon.name} ist für höchstens ${dungeon.groupSize} Spieler ausgelegt.`)
  }
  if (draft.description.length > 500) {
    return fail('description-too-long', 'Die Beschreibung darf höchstens 500 Zeichen lang sein.')
  }
  if (existing) {
    const tooSmall = (Object.keys(draft.capacity) as RoleId[]).find(
      role => existing.participants.filter(participant => participant.role === role).length > draft.capacity[role],
    )
    if (tooSmall) {
      return fail('capacity-below-participants', `Für ${getRole(tooSmall).name} sind bereits mehr Teilnehmer angemeldet als Plätze vorgesehen.`)
    }
  }
  return ok(draft)
}

/** Sagt einen Run ab (Berechtigung wird separat über `can()` geprüft). */
export function cancelRun(run: GroupRun, now: Date): DomainResult<GroupRun, 'run-not-open'> {
  if (run.status !== 'open') return fail('run-not-open', 'Dieser Run ist nicht mehr offen.')
  return ok({ ...run, status: 'cancelled', updatedAt: now.toISOString() })
}

/** Liegt der Run in der Zukunft und ist noch offen? */
export function isUpcoming(run: Pick<GroupRun, 'status' | 'startsAt'>, now: Date): boolean {
  return run.status === 'open' && new Date(run.startsAt).getTime() > now.getTime()
}

export interface RunFilter {
  dungeonSlug?: string | null
  /** Zeitraum ab jetzt in Tagen; null = alle kommenden */
  withinDays?: number | null
  onlyOpenSlots?: boolean
  includeCancelled?: boolean
}

/** Kommende Runs filtern (abgeschlossene und vergangene Runs nie, abgesagte optional). */
export function filterRuns<T extends GroupRun>(runs: readonly T[], filter: RunFilter, now: Date): T[] {
  const until = filter.withinDays != null ? now.getTime() + filter.withinDays * 86_400_000 : Number.POSITIVE_INFINITY
  return runs.filter((run) => {
    const startsAt = Date.parse(run.startsAt)
    if (startsAt <= now.getTime() || startsAt > until) return false
    if (run.status === 'completed') return false
    if (run.status === 'cancelled' && !filter.includeCancelled) return false
    if (filter.dungeonSlug && run.dungeonSlug !== filter.dungeonSlug) return false
    if (filter.onlyOpenSlots && (run.status !== 'open' || computeComposition(run).isFull)) return false
    return true
  })
}
