import type { Race } from '../types'

const source = ['warcrafttavern-forever-race-class']

/**
 * Völker und ihre spielbaren Klassen je Fraktion in WoW: Forever (Stand Launch).
 * Neu gegenüber Classic: Zwerg-Schamane, Gnom-Priester, Mensch-Jäger, Orc-Magier,
 * Troll-Hexenmeister, Untoter Paladin sowie das Volk der Himmelsgeborenen (beide Fraktionen).
 * Der deutsche Name der Himmelsgeborenen folgt der deutschen Presseberichterstattung.
 */
export const races: readonly Race[] = [
  // Allianz
  {
    id: 'human',
    name: 'Mensch',
    nameEn: 'Human',
    classesByFaction: { alliance: ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'mage', 'warlock'] },
    isNewInForever: false,
    sourceIds: source,
  },
  {
    id: 'dwarf',
    name: 'Zwerg',
    nameEn: 'Dwarf',
    classesByFaction: { alliance: ['warrior', 'paladin', 'hunter', 'rogue', 'priest', 'shaman'] },
    isNewInForever: false,
    sourceIds: source,
  },
  {
    id: 'night-elf',
    name: 'Nachtelf',
    nameEn: 'Night Elf',
    classesByFaction: { alliance: ['warrior', 'hunter', 'rogue', 'priest', 'druid'] },
    isNewInForever: false,
    sourceIds: source,
  },
  {
    id: 'gnome',
    name: 'Gnom',
    nameEn: 'Gnome',
    classesByFaction: { alliance: ['warrior', 'rogue', 'priest', 'mage', 'warlock'] },
    isNewInForever: false,
    sourceIds: source,
  },
  // Horde
  {
    id: 'orc',
    name: 'Orc',
    nameEn: 'Orc',
    classesByFaction: { horde: ['warrior', 'hunter', 'rogue', 'shaman', 'mage', 'warlock'] },
    isNewInForever: false,
    sourceIds: source,
  },
  {
    id: 'undead',
    name: 'Untoter',
    nameEn: 'Undead',
    classesByFaction: { horde: ['warrior', 'paladin', 'rogue', 'priest', 'mage', 'warlock'] },
    isNewInForever: false,
    sourceIds: source,
  },
  {
    id: 'tauren',
    name: 'Tauren',
    nameEn: 'Tauren',
    classesByFaction: { horde: ['warrior', 'hunter', 'shaman', 'druid'] },
    isNewInForever: false,
    sourceIds: source,
  },
  {
    id: 'troll',
    name: 'Troll',
    nameEn: 'Troll',
    classesByFaction: { horde: ['warrior', 'hunter', 'rogue', 'priest', 'shaman', 'mage', 'warlock'] },
    isNewInForever: false,
    sourceIds: source,
  },
  // Beide Fraktionen
  {
    id: 'skyborne',
    name: 'Himmelsgeborene',
    nameEn: 'Skyborne',
    classesByFaction: {
      alliance: ['warrior', 'hunter', 'rogue', 'mage', 'druid'],
      horde: ['warrior', 'hunter', 'rogue', 'shaman', 'druid'],
    },
    isNewInForever: true,
    sourceIds: source,
  },
]

export function findRace(id: string, catalog: readonly Race[] = races): Race | undefined {
  return catalog.find(race => race.id === id)
}
