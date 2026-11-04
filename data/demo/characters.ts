import type { Character } from '../../shared/types'

/**
 * EINDEUTIG FIKTIVE Charaktere (Allianz, Demo-Realm).
 * Alle Volk-/Klassen-Kombinationen sind in WoW: Forever spielbar (wird per Test geprüft).
 * Demo-Mitglied 11 hat bewusst noch keinen Charakter (Onboarding-Fall).
 */
type CharacterInput = Pick<Character, 'id' | 'memberId' | 'name' | 'classId' | 'raceId' | 'level' | 'roles' | 'isMain'>

const inputs: CharacterInput[] = [
  { id: 'demo-char-01', memberId: 'demo-member-01', name: 'Eisblume', classId: 'priest', raceId: 'dwarf', level: 60, roles: ['healer'], isMain: true },
  { id: 'demo-char-02', memberId: 'demo-member-01', name: 'Raureif', classId: 'mage', raceId: 'gnome', level: 34, roles: ['dps'], isMain: false },
  { id: 'demo-char-03', memberId: 'demo-member-02', name: 'Thorgrimm', classId: 'warrior', raceId: 'dwarf', level: 60, roles: ['tank', 'dps'], isMain: true },
  { id: 'demo-char-04', memberId: 'demo-member-02', name: 'Hammerherz', classId: 'paladin', raceId: 'dwarf', level: 22, roles: ['tank', 'healer'], isMain: false },
  { id: 'demo-char-05', memberId: 'demo-member-03', name: 'Funkenflug', classId: 'shaman', raceId: 'dwarf', level: 38, roles: ['healer', 'dps'], isMain: true },
  { id: 'demo-char-06', memberId: 'demo-member-04', name: 'Schattensang', classId: 'rogue', raceId: 'night-elf', level: 59, roles: ['dps'], isMain: true },
  { id: 'demo-char-07', memberId: 'demo-member-04', name: 'Pfeilwind', classId: 'hunter', raceId: 'human', level: 17, roles: ['dps'], isMain: false },
  { id: 'demo-char-08', memberId: 'demo-member-05', name: 'Lunarae', classId: 'druid', raceId: 'night-elf', level: 36, roles: ['healer', 'dps'], isMain: true },
  { id: 'demo-char-09', memberId: 'demo-member-06', name: 'Zischelbart', classId: 'warlock', raceId: 'gnome', level: 35, roles: ['dps'], isMain: true },
  { id: 'demo-char-10', memberId: 'demo-member-07', name: 'Sichelmond', classId: 'druid', raceId: 'night-elf', level: 60, roles: ['tank', 'dps'], isMain: true },
  { id: 'demo-char-11', memberId: 'demo-member-07', name: 'Kleinlicht', classId: 'priest', raceId: 'gnome', level: 16, roles: ['healer'], isMain: false },
  { id: 'demo-char-12', memberId: 'demo-member-08', name: 'Windhauch', classId: 'mage', raceId: 'skyborne', level: 37, roles: ['dps'], isMain: true },
  { id: 'demo-char-13', memberId: 'demo-member-09', name: 'Kamillia', classId: 'paladin', raceId: 'human', level: 60, roles: ['healer'], isMain: true },
  { id: 'demo-char-14', memberId: 'demo-member-10', name: 'Glitzerpfeil', classId: 'hunter', raceId: 'skyborne', level: 18, roles: ['dps'], isMain: true },
  { id: 'demo-char-15', memberId: 'demo-member-10', name: 'Federkiel', classId: 'warrior', raceId: 'human', level: 9, roles: ['dps'], isMain: false },
]

export const DEMO_REALM = 'Demo-Realm'

export function createDemoCharacters(now: Date): Character[] {
  return inputs.map((input, index) => ({
    ...input,
    realm: DEMO_REALM,
    faction: 'alliance',
    source: 'demo',
    // Gestaffelte „letzte Aktualisierung“, damit die Anzeige realistisch wirkt
    updatedAt: new Date(now.getTime() - (index + 1) * 3_600_000 * 7).toISOString(),
  }))
}
