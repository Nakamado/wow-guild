import { describe, expect, it } from 'vitest'
import type { Participant } from '#shared/types'
import { describeNotification, runChangeNotifications, timeAgo } from '#shared/domain/notifications'
import { NOW, run } from './fixtures'

const p = (memberId: string, role: Participant['role'], extra: Partial<Participant> = {}): Participant => ({
  memberId, characterId: `c-${memberId}`, role, joinedAt: NOW.toISOString(), ...extra,
})
const ctx = (actorId: string) => ({ actorId, runTitle: 'Todesminen', characterName: (id: string) => `Name ${id}` })
const kinds = (drafts: { memberId: string, kind: string }[]) => drafts.map(d => `${d.memberId}:${d.kind}`).sort()

describe('runChangeNotifications', () => {
  it('meldet der Organisation eine neue Anmeldung mit Charakter und Rolle', () => {
    const before = run()
    const after = run({ participants: [p('m-1', 'tank', { support: true })] })
    const drafts = runChangeNotifications(before, after, ctx('m-1'))
    expect(drafts).toEqual([{
      memberId: 'm-org', kind: 'run-joined', runId: 'run-1',
      data: { runTitle: 'Todesminen', characterName: 'Name c-m-1', role: 'tank', support: true },
    }])
  })

  it('benachrichtigt niemanden über eigene Aktionen der Organisation', () => {
    const after = run({ participants: [p('m-org', 'tank')] })
    expect(runChangeNotifications(run(), after, ctx('m-org'))).toEqual([])
  })

  it('verdrängter Supporter und Abmeldung mit Nachrücken', () => {
    const bumpedBefore = run({ participants: [p('m-s', 'dps', { support: true })] })
    const bumpedAfter = run({ participants: [p('m-new', 'dps')], waitlist: [p('m-s', 'dps', { support: true })] })
    expect(kinds(runChangeNotifications(bumpedBefore, bumpedAfter, ctx('m-new')))).toEqual(['m-org:run-joined', 'm-s:run-bumped'])

    const leaveBefore = run({ participants: [p('m-1', 'tank')], waitlist: [p('m-2', 'tank')] })
    const leaveAfter = run({ participants: [p('m-2', 'tank')] })
    expect(kinds(runChangeNotifications(leaveBefore, leaveAfter, ctx('m-1')))).toEqual(['m-2:run-promoted', 'm-org:run-left'])
  })

  it('Flex-Teilnahme, die für eine Anmeldung die Rolle tauscht', () => {
    const before = run({ participants: [p('m-flex', 'healer', { altRole: 'dps' })] })
    const after = run({ participants: [p('m-flex', 'dps', { altRole: 'healer', moved: true }), p('m-new', 'healer')] })
    const drafts = runChangeNotifications(before, after, ctx('m-new'))
    expect(kinds(drafts)).toEqual(['m-flex:run-relocated', 'm-org:run-joined'])
    expect(drafts.find(d => d.kind === 'run-relocated')?.data.role).toBe('dps')
  })

  it('Absage mit Grund, Verschiebung und Löschen gehen an alle Angemeldeten', () => {
    const before = run({ participants: [p('m-1', 'tank'), p('m-org', 'healer')], waitlist: [p('m-2', 'dps')] })
    const cancelled = runChangeNotifications(before, { ...before, status: 'cancelled', cancelReason: 'Krank' }, ctx('m-org'))
    expect(kinds(cancelled)).toEqual(['m-1:run-cancelled', 'm-2:run-cancelled'])
    expect(cancelled[0]!.data.reason).toBe('Krank')

    const moved = runChangeNotifications(before, { ...before, startsAt: '2026-11-06T18:00:00.000Z' }, ctx('m-org'))
    expect(kinds(moved)).toEqual(['m-1:run-rescheduled', 'm-2:run-rescheduled'])

    const deleted = runChangeNotifications(before, null, ctx('m-org'))
    expect(kinds(deleted)).toEqual(['m-1:run-deleted', 'm-2:run-deleted'])
    expect(deleted[0]!.runId).toBeNull()
  })
})

describe('describeNotification', () => {
  it('liefert Text und Link', () => {
    expect(describeNotification({ kind: 'run-joined', runId: 'r1', data: { runTitle: 'Todesminen', characterName: 'Eisblume', role: 'healer' } }))
      .toEqual({ href: '/gruppen/r1', text: 'Eisblume hat sich für „Todesminen“ angemeldet (Heiler).' })
    expect(describeNotification({ kind: 'run-cancelled', runId: 'r1', data: { runTitle: 'Todesminen', reason: 'Krank' } }).text)
      .toBe('„Todesminen“ wurde abgesagt – Krank.')
    expect(describeNotification({ kind: 'run-deleted', runId: null, data: { runTitle: 'Todesminen' } }).href).toBeNull()
  })

  it('timeAgo', () => {
    expect(timeAgo('2026-11-04T11:59:40.000Z', NOW)).toBe('gerade eben')
    expect(timeAgo('2026-11-04T11:55:00.000Z', NOW)).toBe('vor 5 Min.')
    expect(timeAgo('2026-11-04T09:00:00.000Z', NOW)).toBe('vor 3 Std.')
    expect(timeAgo('2026-11-03T09:00:00.000Z', NOW)).toBe('gestern')
  })
})
