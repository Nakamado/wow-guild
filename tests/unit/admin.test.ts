import { describe, expect, it } from 'vitest'
import { checkGrant, checkRoleChange, detectImageType, leaderboardCharacterIds, retainUntil } from '../../shared/domain/admin'
import { accessLevelFor, can, type Viewer } from '../../shared/domain/permissions'
import { LeaderboardGrantInputSchema } from '../../shared/schemas/admin'

const SUPER = '591736149647687697'
const MIINYU = '291187664994959360'
const MEMBER = '100000000000000003'

const as = (level: Viewer['level'], memberId: string | null = MEMBER): Viewer => ({ level, memberId })

describe('Rollen und Berechtigungen', () => {
  it('nur der Hauptadmin verwaltet Rollen, Protokoll und Ranglistenfreigaben', () => {
    for (const action of ['roles:manage', 'activity:view', 'leaderboard:grant'] as const) {
      expect(can(as('superadmin', SUPER), action)).toBe(true)
      expect(can(as('admin', MIINYU), action)).toBe(false)
      expect(can(as('member'), action)).toBe(false)
      expect(can(as('visitor', null), action)).toBe(false)
    }
  })

  it('Admins behalten ihre bisherigen Rechte und sehen den Adminbereich, Mitglieder nicht', () => {
    for (const action of ['admin:area', 'admin:tools', 'board:manage', 'runs:moderate'] as const) {
      expect(can(as('admin', MIINYU), action)).toBe(true)
      expect(can(as('superadmin', SUPER), action)).toBe(true)
      expect(can(as('member'), action)).toBe(false)
    }
    expect(can(as('member'), 'characters:manage', { ownerId: MEMBER })).toBe(true)
    expect(can(as('member'), 'characters:manage', { ownerId: MIINYU })).toBe(false)
  })

  it('Admin ist eine Webseitenrolle – die Discord-Adminrolle allein reicht nicht mehr', () => {
    const base = { memberRoleId: 'wow', superadminId: SUPER }
    expect(accessLevelFor({ ...base, userId: SUPER, roleIds: null, isSiteAdmin: false })).toBe('superadmin')
    expect(accessLevelFor({ ...base, userId: MIINYU, roleIds: ['discord-admin'], isSiteAdmin: true })).toBe('admin')
    expect(accessLevelFor({ ...base, userId: MEMBER, roleIds: ['discord-admin', 'wow'], isSiteAdmin: false })).toBe('member')
    expect(accessLevelFor({ ...base, userId: MEMBER, roleIds: ['discord-admin'], isSiteAdmin: false })).toBe('user')
    // nicht (mehr) auf dem Discord-Server: auch ein Webseiten-Admin ist dann nur angemeldet
    expect(accessLevelFor({ ...base, userId: MIINYU, roleIds: null, isSiteAdmin: true })).toBe('user')
    // ohne konfigurierten Hauptadmin gibt es keinen
    expect(accessLevelFor({ ...base, superadminId: null, userId: SUPER, roleIds: ['wow'], isSiteAdmin: false })).toBe('member')
  })

  it('Rollenänderungen: nur Hauptadmin, nie am Hauptadmin oder an sich selbst', () => {
    const base = { actorId: SUPER, superadminId: SUPER, targetExists: true }
    expect(checkRoleChange({ ...base, actorLevel: 'superadmin', targetId: MIINYU })).toEqual({ ok: true, value: true })
    expect(checkRoleChange({ ...base, actorLevel: 'admin', actorId: MIINYU, targetId: MEMBER })).toMatchObject({ ok: false, error: { code: 'forbidden' } })
    expect(checkRoleChange({ ...base, actorLevel: 'member', actorId: MEMBER, targetId: MEMBER })).toMatchObject({ ok: false, error: { code: 'forbidden' } })
    expect(checkRoleChange({ ...base, actorLevel: 'superadmin', targetId: SUPER })).toMatchObject({ ok: false, error: { code: 'superadmin-fixed' } })
    expect(checkRoleChange({ ...base, actorLevel: 'superadmin', targetId: MEMBER, targetExists: false })).toMatchObject({ ok: false, error: { code: 'not-found' } })
  })
})

describe('Ranglistenfreigaben durch den Hauptadmin', () => {
  const base = { consentDate: '2026-11-07', today: '2026-11-07', characterOwnerId: MEMBER, memberId: MEMBER, revokedOn: null, activeGrantExists: false }

  it('braucht eine dokumentierte, passende Zustimmung', () => {
    expect(checkGrant(base)).toEqual({ ok: true, value: true })
    expect(checkGrant({ ...base, characterOwnerId: MIINYU })).toMatchObject({ ok: false, error: { code: 'character-mismatch' } })
    expect(checkGrant({ ...base, consentDate: '2026-11-08' })).toMatchObject({ ok: false, error: { code: 'consent-in-future' } })
    expect(checkGrant({ ...base, activeGrantExists: true })).toMatchObject({ ok: false, error: { code: 'already-granted' } })
  })

  it('nach einem Widerruf nur mit neuer Zustimmung', () => {
    expect(checkGrant({ ...base, consentDate: '2026-11-01', revokedOn: '2026-11-05' })).toMatchObject({ ok: false, error: { code: 'consent-before-revocation' } })
    expect(checkGrant({ ...base, consentDate: '2026-11-05', revokedOn: '2026-11-05' })).toEqual({ ok: true, value: true })
  })

  it('verlangt die ausdrückliche Bestätigung im Formular', () => {
    const input = { memberId: MEMBER, characterId: '3f1c2a7e-5b4d-4c8e-9a1f-2b3c4d5e6f70', consentChannel: 'discord-message', consentDate: '2026-11-07' }
    expect(LeaderboardGrantInputSchema.safeParse({ ...input, confirmed: false }).success).toBe(false)
    expect(LeaderboardGrantInputSchema.safeParse({ ...input, consentChannel: 'gerücht', confirmed: true }).success).toBe(false)
    expect(LeaderboardGrantInputSchema.parse({ ...input, note: '  ', confirmed: true }).note).toBeNull()
  })

  it('eine Freigabe gilt nur für genau einen Charakter, die Selbstfreigabe für alle in der Gilde', () => {
    const characters = [
      { id: 'main', memberId: MEMBER, inGuild: true },
      { id: 'twink', memberId: MEMBER, inGuild: true },
      { id: 'fremd', memberId: MEMBER, inGuild: false },
      { id: 'miinyu', memberId: MIINYU, inGuild: true },
    ]
    const grant = { characterId: 'main', memberId: MEMBER, revokedAt: null }
    expect([...leaderboardCharacterIds({ characters, optedInMemberIds: new Set(), grants: [grant] })]).toEqual(['main'])
    expect([...leaderboardCharacterIds({ characters, optedInMemberIds: new Set(), grants: [{ ...grant, revokedAt: '2026-11-07T10:00:00Z' }] })]).toEqual([])
    expect([...leaderboardCharacterIds({ characters, optedInMemberIds: new Set([MEMBER]), grants: [] })]).toEqual(['main', 'twink'])
    // Freigabe mit falschem Mitglied greift nicht
    expect([...leaderboardCharacterIds({ characters, optedInMemberIds: new Set(), grants: [{ ...grant, characterId: 'miinyu' }] })]).toEqual([])
  })
})

describe('Nachweise und Aufbewahrung', () => {
  it('erkennt Bildtypen am Inhalt, nicht am Namen', () => {
    expect(detectImageType(new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0]))).toBe('png')
    expect(detectImageType(new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]))).toBe('jpg')
    expect(detectImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe('webp')
    expect(detectImageType(new TextEncoder().encode('<svg onload=alert(1)>'))).toBeNull()
    expect(detectImageType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull()
  })

  it('berechnet das Löschdatum aus der Frist', () => {
    const now = new Date('2026-11-07T10:00:00Z')
    expect(retainUntil(now, 90).toISOString()).toBe('2027-02-05T10:00:00.000Z')
    expect(retainUntil(now, 0).getTime()).toBeGreaterThan(now.getTime())
  })
})
