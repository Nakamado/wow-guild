/**
 * Dungeon-Quests je Dungeon – Grundlage für „Dungeon vollständig“ (alle Dungeon-Quests der eigenen
 * Fraktion erledigt), solange die Dungeon-API von WoW: Forever keine Abschlüsse liefert.
 *
 * - Klassische Dungeons: Die Quests kommen automatisch aus der Blizzard-API
 *   (`/data/wow/quest/area/{areaId}`). Mehrflügelige Instanzen (Kloster, Düsterbruch, Stratholme,
 *   Blackrockspitze) teilen sich dort ein Gebiet und werden deshalb gemeinsam gewertet.
 *   Prüfen lässt sich die Zuordnung unter /admin/blizzard → „Dungeon-Quests prüfen“.
 * - Neue Forever-Dungeons: Ihre Quests hängen in der API am umliegenden Gebiet (z. B. Dun Morogh),
 *   deshalb pflegen wir sie hier selbst – IDs aus `/quests/completed` bzw. Guides.
 *
 * Klassen- und Volksquests zählen nie (Angabe `requirements` in den Questdaten).
 */
export interface DungeonQuestGroup {
  /** eigene Kennung (bei einflügeligen Dungeons = Dungeon-Slug) */
  id: string
  name: string
  /** zugehörige Dungeon-Slugs aus shared/data/dungeons.ts */
  dungeonSlugs: string[]
  /** Gebiet in der Blizzard-API (klassische Dungeons) */
  areaId?: number
  /** von Hand gepflegte Quests (Forever-Dungeons) */
  quests?: { alliance: number[], horde: number[] }
}

export const dungeonQuestGroups: DungeonQuestGroup[] = [
  { id: 'ragefire-chasm', name: 'Der Flammenschlund', dungeonSlugs: ['ragefire-chasm'], areaId: 2437 },
  {
    id: 'hall-of-thanes',
    name: 'Halle der Thane',
    dungeonSlugs: ['hall-of-thanes'],
    // Important Heirlooms, The Restless Dead, Old Ironforge Incursion, An Ancient Grudge, The Treaty of Understanding
    // (Horde: nur Important Heirlooms und An Ancient Grudge)
    quests: { alliance: [96403, 96394, 96393, 96395, 98423], horde: [96403, 96395] },
  },
  { id: 'wailing-caverns', name: 'Die Höhlen des Wehklagens', dungeonSlugs: ['wailing-caverns'], areaId: 718 },
  { id: 'the-deadmines', name: 'Die Todesminen', dungeonSlugs: ['the-deadmines'], areaId: 1581 },
  { id: 'shadowfang-keep', name: 'Burg Schattenfang', dungeonSlugs: ['shadowfang-keep'], areaId: 209 },
  { id: 'blackfathom-deeps', name: 'Tiefschwarze Grotte', dungeonSlugs: ['blackfathom-deeps'], areaId: 719 },
  { id: 'the-stockade', name: 'Das Verlies', dungeonSlugs: ['the-stockade'], areaId: 717 },
  { id: 'gnomeregan', name: 'Gnomeregan', dungeonSlugs: ['gnomeregan'], areaId: 721 },
  { id: 'razorfen-kraul', name: 'Kral der Klingenhauer', dungeonSlugs: ['razorfen-kraul'], areaId: 491 },
  {
    id: 'scarlet-monastery',
    name: 'Scharlachrotes Kloster',
    dungeonSlugs: ['scarlet-monastery-graveyard', 'scarlet-monastery-library', 'scarlet-monastery-armory', 'scarlet-monastery-cathedral'],
    areaId: 796,
  },
  { id: 'razorfen-downs', name: 'Hügel von Razorfen', dungeonSlugs: ['razorfen-downs'], areaId: 722 },
  { id: 'uldaman', name: 'Uldaman', dungeonSlugs: ['uldaman'], areaId: 1337 },
  { id: 'zulfarrak', name: 'Zul\'Farrak', dungeonSlugs: ['zulfarrak'], areaId: 1176 },
  { id: 'maraudon', name: 'Maraudon', dungeonSlugs: ['maraudon'], areaId: 2100 },
  { id: 'temple-of-atal-hakkar', name: 'Versunkener Tempel', dungeonSlugs: ['temple-of-atal-hakkar'], areaId: 1477 },
  { id: 'blackrock-depths', name: 'Blackrocktiefen', dungeonSlugs: ['blackrock-depths'], areaId: 1584 },
  { id: 'blackrock-spire', name: 'Blackrockspitze', dungeonSlugs: ['lower-blackrock-spire', 'upper-blackrock-spire'], areaId: 1583 },
  { id: 'dire-maul', name: 'Düsterbruch', dungeonSlugs: ['dire-maul-east', 'dire-maul-west', 'dire-maul-north'], areaId: 2557 },
  { id: 'stratholme', name: 'Stratholme', dungeonSlugs: ['stratholme-living', 'stratholme-undead'], areaId: 2017 },
  { id: 'scholomance', name: 'Scholomance', dungeonSlugs: ['scholomance'], areaId: 2057 },
]
