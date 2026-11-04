import type { Dungeon } from '../types'

/**
 * Raids in WoW: Forever (erste Stufe, öffnet am 09.12.2026).
 * Quelle: offizielle Blizzard-Übersicht (Standorte, Raidgrößen, Stufe 60).
 * Deutsche Namen nur, wo sie etabliert sind (Onyxias Hort); neue Raids vorerst englisch.
 * Weitere Raids (Frühjahr/Sommer 2027) werden hier ergänzt.
 */
const BLIZZARD = 'blizzard-forever-raids'
const OPENS = 'Öffnet am 09.12.2026.'

function raid(input: Pick<Dungeon, 'slug' | 'name' | 'nameEn' | 'abbreviation' | 'description' | 'zone' | 'groupSize' | 'isNewInForever'>): Dungeon {
  return {
    ...input,
    kind: 'raid',
    levelRange: { min: 60, max: 60 },
    minLevel: 60,
    image: null,
    note: OPENS,
    sourceIds: [BLIZZARD],
  }
}

export const raids: readonly Dungeon[] = [
  raid({
    slug: 'the-barrow-deeps',
    name: 'The Barrow Deeps',
    nameEn: 'The Barrow Deeps',
    abbreviation: 'BD',
    description: 'Neuer Raid für 10 Spieler unter dem Berg Hyjal.',
    zone: 'Berg Hyjal',
    groupSize: 10,
    isNewInForever: true,
  }),
  raid({
    slug: 'hyjal-summit',
    name: 'Hyjal Summit',
    nameEn: 'Hyjal Summit',
    abbreviation: 'Hyjal',
    description: 'Neuer Raid für 20 Spieler am Gipfel des Berges Hyjal nahe Nordrassil.',
    zone: 'Berg Hyjal',
    groupSize: 20,
    isNewInForever: true,
  }),
  raid({
    slug: 'onyxias-lair',
    name: 'Onyxias Hort',
    nameEn: 'Onyxia\'s Lair',
    abbreviation: 'Ony',
    description: 'Raid für 40 Spieler in den Düstermarschen.',
    zone: 'Düstermarschen',
    groupSize: 40,
    isNewInForever: false,
  }),
]
