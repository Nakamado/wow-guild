import { describe, expect, it } from 'vitest'
import { activeBoardNotes, checkBoardInput } from '../../shared/domain/board'
import { can } from '../../shared/domain/permissions'
import { BoardNoteInputSchema } from '../../shared/schemas/board'

// 06.11.2026, 23:30 Uhr in Berlin (22:30 UTC)
const NOW = new Date('2026-11-06T22:30:00Z')
const note = (id: string, expiresOn: string | null, createdAt: string) => ({ id, expiresOn, createdAt })

describe('Schwarzes Brett', () => {
  it('zeigt nur nicht abgelaufene Aushänge, neueste zuerst; der Ablauftag zählt noch mit', () => {
    const notes = [
      note('alt', '2026-11-05', '2026-11-01T10:00:00.000Z'),
      note('heute', '2026-11-06', '2026-11-02T10:00:00.000Z'),
      note('offen', null, '2026-11-04T10:00:00.000Z'),
    ]
    expect(activeBoardNotes(notes, NOW).map(entry => entry.id)).toEqual(['offen', 'heute'])
    // kurz nach Mitternacht in Berlin ist „heute“ abgelaufen
    expect(activeBoardNotes(notes, new Date('2026-11-06T23:05:00Z')).map(entry => entry.id)).toEqual(['offen'])
  })

  it('bereinigt Eingaben und lehnt Ablaufdaten in der Vergangenheit ab', () => {
    const input = BoardNoteInputSchema.parse({ title: '  100 Fische  ', text: '   ', expiresOn: '' })
    expect(input).toEqual({ title: '100 Fische', text: null, expiresOn: null })
    expect(checkBoardInput({ ...input, expiresOn: '2026-11-05' }, NOW)).toMatchObject({ ok: false, error: { code: 'expired' } })
    expect(checkBoardInput({ ...input, expiresOn: '2026-11-06' }, NOW).ok).toBe(true)
    expect(BoardNoteInputSchema.safeParse({ title: '' }).success).toBe(false)
  })

  it('Mitglieder lesen, nur Admins verwalten', () => {
    expect(can({ level: 'visitor', memberId: null }, 'board:view')).toBe(false)
    expect(can({ level: 'member', memberId: 'm' }, 'board:view')).toBe(true)
    expect(can({ level: 'member', memberId: 'm' }, 'board:manage')).toBe(false)
    expect(can({ level: 'admin', memberId: 'a' }, 'board:manage')).toBe(true)
  })
})
