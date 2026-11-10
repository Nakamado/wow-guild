import { getRole } from '../data/roles'
import type { Character, CommunityMember, Dungeon, GroupRun, Participant, RoleCapacity, RoleId } from '../types'
import { canPlayRole, defaultCatalog, type GameCatalog } from './characters'
import { computeComposition, totalCapacity } from './composition'
import { checkLevelFit } from './level'
import { dungeonQuestOptions } from './quests'
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
  /** als Supporter: hilft aus, macht aber Platz für feste Anmeldungen */
  support?: boolean
  /** Ausweichrolle (Flex): wird genutzt, wenn die Hauptrolle voll ist */
  altRole?: RoleId | null
  catalog?: GameCatalog
}

export interface JoinCheck {
  /** `participant` = Platz in der Gruppe, `waitlist` = Rolle voll, Warteliste aktiv */
  placement: 'participant' | 'waitlist'
  /** Nicht-blockierende Hinweise, z. B. zum Levelbereich */
  warnings: string[]
  /** Rolle, in der die Anmeldung landet (Hauptrolle oder Ausweichrolle) */
  role?: RoleId
  /** in der Ausweichrolle statt der Hauptrolle */
  movedToAlt?: boolean
  /** Flex-Teilnehmer, der für diese Anmeldung in seine Ausweichrolle wechselt */
  relocated?: { participant: Participant, toRole: RoleId } | null
  /** Supporter, der für diese feste Anmeldung auf die Warteliste rückt */
  bumped?: Participant | null
}

/**
 * Supporter, der für eine feste Anmeldung Platz macht: der zuletzt angemeldete Supporter
 * derselben Rolle mit Platz in der Gruppe.
 */
export function supporterToBump(run: Pick<GroupRun, 'participants'>, role: RoleId): Participant | null {
  const supporters = run.participants.filter(entry => entry.role === role && entry.support)
  return supporters.sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt))[0] ?? null
}

/** Flex-Teilnehmer in `role`, der in seine Ausweichrolle wechseln kann (dort ist ein Platz frei) */
export function flexToRelocate(run: Pick<GroupRun, 'participants' | 'capacity'>, role: RoleId): Participant | null {
  const open = (target: RoleId) => run.capacity[target] - run.participants.filter(entry => entry.role === target).length > 0
  const candidates = run.participants.filter(entry => entry.role === role && entry.altRole && entry.altRole !== role && open(entry.altRole))
  return candidates.sort((a, b) => Date.parse(b.joinedAt) - Date.parse(a.joinedAt))[0] ?? null
}

/** Wechsel in die jeweils andere Rolle (Haupt- ↔ Ausweichrolle) */
export function swapRole(participant: Participant): Participant {
  const { altRole } = participant
  if (!altRole) return participant
  const moved = !participant.moved
  return { ...participant, role: altRole, altRole: participant.role, ...(moved ? { moved: true } : { moved: undefined }) }
}

export type JoinPlan = Pick<JoinCheck, 'placement' | 'role' | 'movedToAlt' | 'relocated' | 'bumped'>

/**
 * Wo landet eine Anmeldung? Reihenfolge, damit möglichst alle dabei bleiben:
 * 1. freier Platz in der Hauptrolle, sonst in der Ausweichrolle
 * 2. ein Flex-Teilnehmer wechselt in seine Ausweichrolle und macht Platz (Haupt-, dann Ausweichrolle)
 * 3. nur bei fester Anmeldung: ein Supporter rückt auf die Warteliste (Haupt-, dann Ausweichrolle)
 * 4. Warteliste (falls aktiv) – sonst null (voll)
 * Dieselbe Reihenfolge setzt `join_run()` in Postgres um.
 */
export function planJoin(run: Pick<GroupRun, 'participants' | 'capacity' | 'waitlistEnabled'>, role: RoleId, altRole: RoleId | null | undefined, support: boolean): JoinPlan | null {
  const roles = altRole && altRole !== role ? [role, altRole] : [role]
  const open = (target: RoleId) => run.capacity[target] - run.participants.filter(entry => entry.role === target).length > 0
  const at = (target: RoleId) => ({ role: target, movedToAlt: target !== role })

  for (const target of roles) {
    if (open(target)) return { placement: 'participant', ...at(target) }
  }
  for (const target of roles) {
    const flex = flexToRelocate(run, target)
    if (flex) return { placement: 'participant', ...at(target), relocated: { participant: flex, toRole: flex.altRole! } }
  }
  if (!support) {
    for (const target of roles) {
      const bumped = supporterToBump(run, target)
      if (bumped) return { placement: 'participant', ...at(target), bumped }
    }
  }
  return run.waitlistEnabled ? { placement: 'waitlist', role, movedToAlt: false } : null
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
  const altRole = input.altRole && input.altRole !== role ? input.altRole : null
  if (altRole) {
    const altCheck = canPlayRole(character, altRole, catalog)
    if (!altCheck.ok) return altCheck
  }

  const levelFit = checkLevelFit(character.level, dungeon)
  if (levelFit.blocking) return fail('below-minimum-level', levelFit.message)
  const warnings = levelFit.status === 'fit' ? [] : [levelFit.message]

  const plan = planJoin(run, role, altRole, Boolean(input.support))
  if (!plan) {
    const names = [role, altRole].filter(Boolean).map(entry => getRole(entry!).name).join(' und ')
    return fail('role-full', `Alle Plätze für ${names} sind bereits belegt.`)
  }
  if (plan.placement === 'waitlist') {
    return ok({ ...plan, warnings: [...warnings, `Alle ${getRole(role).name}-Plätze sind belegt – du kommst auf die Warteliste.`] })
  }
  if (plan.movedToAlt) {
    return ok({ ...plan, warnings: [...warnings, `${getRole(role).name} ist voll – du bist als ${getRole(plan.role!).name} dabei.`] })
  }
  return ok({ ...plan, warnings })
}

/** Führt die Anmeldung aus (nach erfolgreicher Prüfung). */
export function joinRun(input: JoinInput): DomainResult<{ run: GroupRun, check: JoinCheck }, JoinErrorCode> {
  const check = canJoinRun(input)
  if (!check.ok) return check

  const plan = check.value
  const altRole = input.altRole && input.altRole !== input.role ? input.altRole : null
  const base: Participant = {
    memberId: input.member.id,
    characterId: input.character.id,
    role: input.role,
    joinedAt: input.now.toISOString(),
    ...(input.support ? { support: true } : {}),
    ...(altRole ? { altRole } : {}),
  }
  // in der Ausweichrolle gelandet: Rollen tauschen (altRole = eigentliche Hauptrolle)
  const participant = plan.movedToAlt ? swapRole(base) : base

  let participants = input.run.participants
  let waitlist = input.run.waitlist
  if (plan.relocated) {
    const flex = plan.relocated.participant
    participants = participants.map(entry => (entry === flex ? swapRole(entry) : entry))
  }
  if (plan.bumped) {
    participants = participants.filter(entry => entry !== plan.bumped)
    // verdrängter Supporter rückt an seiner Anmeldezeit in die Warteliste ein
    waitlist = [...waitlist, plan.bumped].sort((a, b) => Date.parse(a.joinedAt) - Date.parse(b.joinedAt))
  }
  const run: GroupRun = plan.placement === 'participant'
    ? { ...input.run, participants: [...participants, participant], waitlist, updatedAt: participant.joinedAt }
    : { ...input.run, waitlist: [...waitlist, participant], updatedAt: participant.joinedAt }

  return ok({ run, check: check.value })
}

export type LeaveErrorCode = 'not-joined' | 'run-not-open'

/**
 * Meldet ein Mitglied ab. Wird ein Platz frei, rückt von der Warteliste nach: zuerst feste
 * Anmeldungen, dann Supporter – jeweils in Anmeldereihenfolge, mit der Rolle als Haupt- oder
 * Ausweichrolle.
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
  // Nachrücken: wer die Rolle als Haupt- oder Ausweichrolle angegeben hat; feste Anmeldungen zuerst
  const fits = (entry: Participant) => entry.role === participant.role || entry.altRole === participant.role
  const promoted = run.waitlist.find(entry => fits(entry) && !entry.support)
    ?? run.waitlist.find(fits)
    ?? null
  const waitlist = promoted ? run.waitlist.filter(entry => entry !== promoted) : run.waitlist
  const placed = promoted && promoted.role !== participant.role ? swapRole(promoted) : promoted

  return ok({
    run: { ...run, participants: placed ? [...participants, placed] : participants, waitlist, updatedAt },
    promoted: placed,
  })
}

export type RunValidationCode
  = | 'starts-in-past'
    | 'capacity-empty'
    | 'capacity-exceeds-group-size'
    | 'description-too-long'
    | 'capacity-below-participants'
    | 'unknown-quest'

export interface RunDraft {
  startsAt: string
  capacity: RoleCapacity
  description: string
  /** geplante Dungeon-Quests (optional) */
  questIds?: number[]
}

/** Prüft Eingaben beim Erstellen oder Bearbeiten eines Runs. */
export function validateRunDraft(
  draft: RunDraft,
  dungeon: Pick<Dungeon, 'groupSize' | 'name'> & { slug?: string },
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
  if (draft.questIds?.length) {
    const known = new Set(dungeonQuestOptions(dungeon.slug ?? '').map(option => option.id))
    if (draft.questIds.some(id => !known.has(id))) {
      return fail('unknown-quest', `Mindestens eine der gewählten Quests gehört nicht zu ${dungeon.name}.`)
    }
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
export function cancelRun(run: GroupRun, now: Date, reason: string | null = null): DomainResult<GroupRun, 'run-not-open'> {
  if (run.status !== 'open') return fail('run-not-open', 'Dieser Run ist nicht mehr offen.')
  return ok({ ...run, status: 'cancelled', cancelReason: reason, updatedAt: now.toISOString() })
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
