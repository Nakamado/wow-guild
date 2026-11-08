import { describe, expect, it } from 'vitest'
import { computeComposition, defaultCapacity } from '../../shared/domain/composition'
import { checkLevelFit } from '../../shared/domain/level'
import { cancelRun, canJoinRun, filterRuns, joinRun, leaveRun, validateRunDraft } from '../../shared/domain/runs'
import type { Participant } from '../../shared/types'
import { character, dungeon, IN_ONE_DAY, member, NOW, run } from './fixtures'

const participant = (memberId: string, role: Participant['role'], characterId = `c-${memberId}`): Participant => ({
  memberId,
  characterId,
  role,
  joinedAt: NOW.toISOString(),
})

const join = (overrides: Partial<Parameters<typeof canJoinRun>[0]> = {}) =>
  canJoinRun({
    run: run(),
    dungeon,
    member: member('m-1'),
    character: character('c-1', 'm-1'),
    role: 'tank',
    now: NOW,
    ...overrides,
  })

describe('checkLevelFit', () => {
  it('passt im empfohlenen Bereich', () => {
    expect(checkLevelFit(22, dungeon)).toMatchObject({ status: 'fit', blocking: false })
  })

  it('blockiert unter der Mindeststufe und erklärt warum', () => {
    const fit = checkLevelFit(12, dungeon)
    expect(fit).toMatchObject({ status: 'below-minimum', blocking: true })
    expect(fit.message).toContain('mindestens Stufe 15')
  })

  it('warnt unter und über dem empfohlenen Bereich, ohne zu blockieren', () => {
    expect(checkLevelFit(17, dungeon)).toMatchObject({ status: 'below-recommended', blocking: false })
    expect(checkLevelFit(40, dungeon)).toMatchObject({ status: 'above-recommended', blocking: false })
  })

  it('blockiert nie, wenn keine Mindeststufe bekannt ist', () => {
    expect(checkLevelFit(1, { ...dungeon, minLevel: null }).blocking).toBe(false)
  })
})

describe('computeComposition', () => {
  it('zeigt Besetzung je Rolle (Tank 1/1 · Heiler 0/1 · DD 2/3)', () => {
    const composition = computeComposition(run({
      participants: [participant('a', 'tank'), participant('b', 'dps'), participant('c', 'dps')],
    }))
    expect(composition.slots).toEqual([
      { role: 'tank', filled: 1, capacity: 1, open: 0 },
      { role: 'healer', filled: 0, capacity: 1, open: 1 },
      { role: 'dps', filled: 2, capacity: 3, open: 1 },
    ])
    expect(composition).toMatchObject({ filled: 3, capacity: 5, open: 2, isFull: false })
  })

  it('liefert 1/1/3 als Standard für Fünfer-Dungeons', () => {
    expect(defaultCapacity(5)).toEqual({ tank: 1, healer: 1, dps: 3 })
    const raid = defaultCapacity(15)
    expect(raid.tank + raid.healer + raid.dps).toBe(15)
  })
})

describe('canJoinRun', () => {
  it('erlaubt einen passenden Charakter', () => {
    expect(join()).toEqual({ ok: true, value: { placement: 'participant', warnings: [] } })
  })

  it('verweigert Nicht-Gildenmitgliedern die Teilnahme', () => {
    expect(join({ member: member('m-1', { isGuildMember: false }) })).toMatchObject({ ok: false, error: { code: 'not-guild-member' } })
  })

  it('verhindert doppelte Anmeldung desselben Mitglieds (auch mit anderem Charakter)', () => {
    const result = join({
      run: run({ participants: [participant('m-1', 'dps', 'c-other')] }),
    })
    expect(result).toMatchObject({ ok: false, error: { code: 'already-joined' } })
  })

  it('verhindert Anmeldungen mit fremden Charakteren', () => {
    expect(join({ character: character('c-1', 'm-2') })).toMatchObject({ ok: false, error: { code: 'character-not-owned' } })
  })

  it('prüft, ob die Klasse die Rolle spielen kann', () => {
    const mage = character('c-1', 'm-1', { classId: 'mage', raceId: 'gnome', roles: ['dps'] })
    const result = join({ character: mage, role: 'healer' })
    expect(result).toMatchObject({ ok: false, error: { code: 'role-not-supported-by-class' } })
    if (!result.ok) expect(result.error.message).toBe('Magier kann nicht als Heiler spielen.')
  })

  it('prüft, ob der Charakter die Rolle hinterlegt hat', () => {
    const dpsWarrior = character('c-1', 'm-1', { roles: ['dps'] })
    expect(join({ character: dpsWarrior, role: 'tank' })).toMatchObject({ ok: false, error: { code: 'role-not-chosen' } })
  })

  it('blockiert unter der Mindeststufe, warnt außerhalb des empfohlenen Bereichs', () => {
    expect(join({ character: character('c-1', 'm-1', { level: 10 }) })).toMatchObject({ ok: false, error: { code: 'below-minimum-level' } })
    const result = join({ character: character('c-1', 'm-1', { level: 45 }) })
    expect(result.ok && result.value.warnings).toHaveLength(1)
  })

  it('verhindert Überbuchung einer vollen Rolle', () => {
    const result = join({ run: run({ participants: [participant('m-9', 'tank')] }) })
    expect(result).toMatchObject({ ok: false, error: { code: 'role-full' } })
  })

  it('setzt auf die Warteliste, wenn die Rolle voll und die Warteliste aktiv ist', () => {
    const result = join({ run: run({ waitlistEnabled: true, participants: [participant('m-9', 'tank')] }) })
    expect(result.ok && result.value.placement).toBe('waitlist')
  })

  it('verweigert Anmeldungen bei abgesagten oder bereits begonnenen Runs', () => {
    expect(join({ run: run({ status: 'cancelled' }) })).toMatchObject({ ok: false, error: { code: 'run-not-open' } })
    expect(join({ now: new Date(IN_ONE_DAY) })).toMatchObject({ ok: false, error: { code: 'run-started' } })
  })
})

describe('joinRun / leaveRun', () => {
  it('fügt Teilnehmer unveränderlich hinzu', () => {
    const original = run()
    const result = joinRun({ run: original, dungeon, member: member('m-1'), character: character('c-1', 'm-1'), role: 'tank', now: NOW })
    expect(result.ok && result.value.run.participants).toHaveLength(1)
    expect(original.participants).toHaveLength(0)
  })

  it('kann eine Gruppe bis zur maximalen Größe füllen, aber nicht darüber hinaus', () => {
    let current = run({ capacity: { tank: 0, healer: 0, dps: 2 } })
    for (const id of ['m-1', 'm-2']) {
      const result = joinRun({ run: current, dungeon, member: member(id), character: character(`c-${id}`, id, { roles: ['dps'] }), role: 'dps', now: NOW })
      expect(result.ok).toBe(true)
      if (result.ok) current = result.value.run
    }
    expect(computeComposition(current).isFull).toBe(true)
    const third = joinRun({ run: current, dungeon, member: member('m-3'), character: character('c-m-3', 'm-3', { roles: ['dps'] }), role: 'dps', now: NOW })
    expect(third).toMatchObject({ ok: false, error: { code: 'role-full' } })
  })

  it('lässt beim Verlassen die passende Rolle von der Warteliste nachrücken', () => {
    const current = run({
      waitlistEnabled: true,
      participants: [participant('m-1', 'tank'), participant('m-2', 'dps')],
      waitlist: [participant('m-3', 'dps'), participant('m-4', 'tank')],
    })
    const result = leaveRun(current, 'm-1', NOW)
    expect(result.ok && result.value.promoted?.memberId).toBe('m-4')
    expect(result.ok && result.value.run.participants.map(p => p.memberId)).toEqual(['m-2', 'm-4'])
    expect(result.ok && result.value.run.waitlist.map(p => p.memberId)).toEqual(['m-3'])
  })

  it('meldet Fehler, wenn man gar nicht angemeldet ist', () => {
    expect(leaveRun(run(), 'm-1', NOW)).toMatchObject({ ok: false, error: { code: 'not-joined' } })
  })

  it('erlaubt das Verlassen der Warteliste', () => {
    const result = leaveRun(run({ waitlist: [participant('m-1', 'dps')] }), 'm-1', NOW)
    expect(result.ok && result.value.run.waitlist).toHaveLength(0)
  })
})

describe('validateRunDraft / cancelRun', () => {
  const draft = { startsAt: IN_ONE_DAY, capacity: { tank: 1, healer: 1, dps: 3 }, description: '' }

  it('akzeptiert gültige Eingaben', () => {
    expect(validateRunDraft(draft, dungeon, NOW).ok).toBe(true)
  })

  it('lehnt Termine in der Vergangenheit und zu große Gruppen ab', () => {
    expect(validateRunDraft({ ...draft, startsAt: '2026-11-01T18:00:00Z' }, dungeon, NOW)).toMatchObject({ ok: false, error: { code: 'starts-in-past' } })
    expect(validateRunDraft({ ...draft, capacity: { tank: 1, healer: 2, dps: 3 } }, dungeon, NOW)).toMatchObject({ ok: false, error: { code: 'capacity-exceeds-group-size' } })
    expect(validateRunDraft({ ...draft, capacity: { tank: 0, healer: 0, dps: 0 } }, dungeon, NOW)).toMatchObject({ ok: false, error: { code: 'capacity-empty' } })
  })

  it('akzeptiert nur Quests des gewählten Dungeons', () => {
    const stockade = { name: 'Das Verlies', groupSize: 5, slug: 'the-stockade' }
    expect(validateRunDraft({ ...draft, questIds: [377, 391] }, stockade, NOW).ok).toBe(true)
    expect(validateRunDraft({ ...draft, questIds: [] }, stockade, NOW).ok).toBe(true)
    expect(validateRunDraft({ ...draft, questIds: [96403] }, stockade, NOW)).toMatchObject({ ok: false, error: { code: 'unknown-quest' } })
  })

  it('verhindert beim Bearbeiten, dass Plätze unter die Anmeldungen fallen', () => {
    const existing = run({ participants: [participant('a', 'dps'), participant('b', 'dps')] })
    const result = validateRunDraft({ ...draft, capacity: { tank: 1, healer: 1, dps: 1 } }, dungeon, NOW, existing)
    expect(result).toMatchObject({ ok: false, error: { code: 'capacity-below-participants' } })
  })

  it('sagt offene Runs ab, aber keine bereits abgesagten', () => {
    const cancelled = cancelRun(run(), NOW)
    expect(cancelled.ok && cancelled.value.status).toBe('cancelled')
    expect(cancelRun(run({ status: 'cancelled' }), NOW).ok).toBe(false)
  })
})

describe('filterRuns', () => {
  const runs = [
    run({ id: 'soon', startsAt: '2026-11-05T18:00:00Z' }),
    run({ id: 'later', startsAt: '2026-11-20T18:00:00Z', dungeonSlug: 'other' }),
    run({ id: 'full', startsAt: '2026-11-06T18:00:00Z', capacity: { tank: 1, healer: 0, dps: 0 }, participants: [participant('a', 'tank')] }),
    run({ id: 'cancelled', startsAt: '2026-11-06T18:00:00Z', status: 'cancelled' }),
    run({ id: 'past', startsAt: '2026-11-01T18:00:00Z' }),
  ]
  const ids = (filter: Parameters<typeof filterRuns>[1]) => filterRuns(runs, filter, NOW).map(entry => entry.id)

  it('zeigt nur kommende Runs, abgesagte nur auf Wunsch', () => {
    expect(ids({})).toEqual(['soon', 'later', 'full'])
    expect(ids({ includeCancelled: true })).toContain('cancelled')
  })

  it('filtert nach Dungeon, Zeitraum und freien Plätzen', () => {
    expect(ids({ dungeonSlug: 'other' })).toEqual(['later'])
    expect(ids({ withinDays: 7 })).toEqual(['soon', 'full'])
    expect(ids({ onlyOpenSlots: true })).toEqual(['soon', 'later'])
  })
})
