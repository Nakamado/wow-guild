import type { GroupRun, Participant, RoleId } from '../../shared/types'
import { at } from './time'

/** Raids öffnen am 09.12.2026 – Demo-Raidtermine liegen nie davor. */
const RAIDS_OPEN = Date.parse('2026-12-10T18:00:00.000Z')

/**
 * EINDEUTIG FIKTIVE Runs, relativ zum aktuellen Datum erzeugt.
 * Deckt typische Zustände ab: offen, voll, mit Warteliste, abgesagt, abgeschlossen.
 */
export function createDemoRuns(now: Date): GroupRun[] {
  const p = (memberId: string, characterId: string, role: RoleId, hoursBefore = 20, support = false, altRole?: RoleId): Participant => ({
    memberId,
    characterId,
    role,
    joinedAt: new Date(now.getTime() - hoursBefore * 3_600_000).toISOString(),
    ...(support ? { support: true } : {}),
    ...(altRole ? { altRole } : {}),
  })
  const created = new Date(now.getTime() - 2 * 86_400_000).toISOString()
  const base = { waitlist: [], discordEventId: null, createdAt: created, updatedAt: created, title: null }

  return [
    {
      ...base,
      id: 'demo-run-01',
      dungeonSlug: 'the-deadmines',
      description: 'Entspannter Run für unsere Twinks. Questen vorher in Westfall abholen!',
      startsAt: at(now, 1, 18),
      organizerId: 'demo-member-02',
      status: 'open',
      capacity: { tank: 1, healer: 1, dps: 3 },
      participants: [
        p('demo-member-02', 'demo-char-04', 'tank'),
        p('demo-member-04', 'demo-char-07', 'dps'),
        p('demo-member-10', 'demo-char-14', 'dps', 6),
      ],
      waitlistEnabled: false,
    },
    {
      ...base,
      id: 'demo-run-02',
      dungeonSlug: 'scarlet-monastery-library',
      title: 'Bibliothek mit Lehrlingen',
      description: 'Wir nehmen uns Zeit und erklären die Bosse.',
      startsAt: at(now, 2, 18),
      organizerId: 'demo-member-07',
      status: 'open',
      capacity: { tank: 1, healer: 1, dps: 3 },
      participants: [
        p('demo-member-07', 'demo-char-10', 'tank'),
        // Flex: Heiler, kann auch DD
        p('demo-member-03', 'demo-char-05', 'healer', 20, false, 'dps'),
        p('demo-member-01', 'demo-char-02', 'dps'),
        p('demo-member-06', 'demo-char-09', 'dps'),
        // Supporter: macht Platz, wenn sich jemand fest als DD anmeldet
        p('demo-member-08', 'demo-char-12', 'dps', 4, true),
      ],
      waitlistEnabled: true,
    },
    {
      ...base,
      id: 'demo-run-03',
      dungeonSlug: 'hall-of-thanes',
      title: 'Erstbesuch: Halle der Thane',
      description: 'Neuer Forever-Dungeon – wir erkunden ihn gemeinsam. Wird auch auf Discord angekündigt.',
      startsAt: at(now, 3, 19),
      organizerId: 'demo-member-01',
      status: 'open',
      capacity: { tank: 1, healer: 1, dps: 3 },
      participants: [
        p('demo-member-07', 'demo-char-11', 'healer'),
        p('demo-member-04', 'demo-char-07', 'dps', 10),
      ],
      waitlistEnabled: true,
      discordEventId: 'demo-event-03',
    },
    {
      ...base,
      id: 'demo-run-04',
      dungeonSlug: 'blackfathom-deeps',
      description: 'Muss leider ausfallen – neuer Termin folgt.',
      startsAt: at(now, 5, 18),
      organizerId: 'demo-member-05',
      status: 'cancelled',
      capacity: { tank: 1, healer: 1, dps: 3 },
      participants: [p('demo-member-05', 'demo-char-08', 'healer')],
      waitlistEnabled: false,
    },
    {
      ...base,
      id: 'demo-run-05',
      dungeonSlug: 'stratholme-living',
      description: 'Farm-Run für Stufe-60-Charaktere. Bitte mit Tränken und Buff-Food.',
      startsAt: at(now, 6, 19),
      organizerId: 'demo-member-09',
      status: 'open',
      capacity: { tank: 1, healer: 1, dps: 3 },
      participants: [
        p('demo-member-02', 'demo-char-03', 'tank'),
        p('demo-member-09', 'demo-char-13', 'healer'),
        p('demo-member-04', 'demo-char-06', 'dps'),
      ],
      waitlistEnabled: false,
    },
    {
      ...base,
      id: 'demo-run-07',
      dungeonSlug: 'the-barrow-deeps',
      title: 'Erster Raidabend: Barrow Deeps',
      description: 'Unser erster Raid! Treffpunkt 15 Minuten vorher am Eingang. Bitte Discord-Sprachkanal „Raid“ betreten.\nLoot: Bedarf vor Gier, Raidleitung entscheidet bei Gleichstand.',
      startsAt: new Date(Math.max(Date.parse(at(now, 9, 18)), RAIDS_OPEN)).toISOString(),
      organizerId: 'demo-member-01',
      status: 'open',
      capacity: { tank: 2, healer: 3, dps: 5 },
      participants: [
        p('demo-member-02', 'demo-char-03', 'tank'),
        p('demo-member-01', 'demo-char-01', 'healer'),
        p('demo-member-09', 'demo-char-13', 'healer'),
        p('demo-member-07', 'demo-char-10', 'dps', 8),
      ],
      waitlistEnabled: true,
    },
    {
      ...base,
      id: 'demo-run-06',
      dungeonSlug: 'scholomance',
      description: 'Abgeschlossen – danke an alle!',
      startsAt: at(now, -3, 18),
      organizerId: 'demo-member-01',
      status: 'completed',
      capacity: { tank: 1, healer: 1, dps: 3 },
      participants: [
        p('demo-member-02', 'demo-char-03', 'tank', 100),
        p('demo-member-01', 'demo-char-01', 'healer', 100),
        p('demo-member-07', 'demo-char-10', 'dps', 100),
        p('demo-member-04', 'demo-char-06', 'dps', 100),
      ],
      waitlistEnabled: false,
    },
  ]
}
