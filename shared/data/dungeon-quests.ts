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
/**
 * Eine Quest eines Dungeons:
 * - Zahl: Quest-ID
 * - Zahlen-Array: dieselbe Quest unter mehreren IDs (eine genügt)
 * - Text: Questtitel (deutsch wie im Spiel) – für Forever-Dungeons, deren IDs wir noch nicht kennen.
 *   Die Seite erkennt die Quest am Titel aus der Blizzard-API, sobald jemand sie erledigt hat.
 */
export type QuestSlot = number | number[] | string

export interface DungeonQuestGroup {
  /** eigene Kennung (bei einflügeligen Dungeons = Dungeon-Slug) */
  id: string
  name: string
  /** zugehörige Dungeon-Slugs aus shared/data/dungeons.ts */
  dungeonSlugs: string[]
  /** Gebiet in der Blizzard-API (klassische Dungeons) */
  areaId?: number
  /**
   * Dungeon-Quests, die in der API an einem anderen Gebiet hängen (z. B. per Drop gestartet und in
   * einer Stadt abgegeben). Abgleich: Addon „Dungeon Journal“ im Spiel.
   */
  extraQuestIds?: number[]
  /**
   * von Hand gepflegte Quests (Forever-Dungeons). Ein Array innerhalb der Liste = dieselbe Quest
   * unter mehreren IDs (eine davon genügt).
   */
  quests?: { alliance: QuestSlot[], horde: QuestSlot[] }
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
  {
    id: 'ruins-of-lordaeron',
    name: 'Ruinen von Lordaeron',
    dungeonSlugs: ['ruins-of-lordaeron'],
    // Allianz: Abominable Creatures, Bloodied Insignia, Remember That I Love You, Crest of Lordaeron
    // („Crest of Lordaeron“ gibt es unter zwei IDs, eine davon ohne Fraktionsangabe – eine genügt).
    // Horde (6 Quests): IDs noch nicht erfasst – nachtragen, sobald bekannt.
    quests: { alliance: [95250, 95195, 92415, [95189, 95204]], horde: [] },
  },
  { id: 'wailing-caverns', name: 'Die Höhlen des Wehklagens', dungeonSlugs: ['wailing-caverns'], areaId: 718 },
  // + 373 „Der nicht abgeschickte Brief“ (Drop von van Cleef, Abgabe in Sturmwind) – laut Dungeon Journal 7 Quests
  { id: 'the-deadmines', name: 'Die Todesminen', dungeonSlugs: ['the-deadmines'], areaId: 1581, extraQuestIds: [373] },
  { id: 'shadowfang-keep', name: 'Burg Schattenfang', dungeonSlugs: ['shadowfang-keep'], areaId: 209 },
  {
    id: 'excavation-site-wetlands',
    name: 'Ausgrabungsstätte: Sumpfland',
    dungeonSlugs: ['excavation-site-wetlands'],
    // 7 Allianz-Quests laut Dungeon-Journal
    quests: { alliance: ['Hochlandhäute', 'Songblades Suche', 'Schrecken im Hochland', 'Verloren im Dickicht', 'Herzgeflecht', 'Urzeitliches Prisma', 'Gefallen im Moor'], horde: [] },
  },
  {
    id: 'city-of-dalaran',
    name: 'Stadt Dalaran',
    dungeonSlugs: ['city-of-dalaran'],
    quests: { alliance: ['Eine grüne Probe', 'Überwältigende Macht', 'Verhungernder Arkaner', 'Das Herz der Störung'], horde: [] },
  },
  {
    id: 'the-drowned-city',
    name: 'The Drowned City',
    dungeonSlugs: ['the-drowned-city'],
    // Titel noch aus der Beta (englisch) – durch die deutschen ersetzen, sobald der Dungeon erscheint
    quests: { alliance: ['Findings for the Explorer\'s League', 'The Web of Magic', 'Ancient Gurubashi Secrets', 'Shady Saltseers', 'The Saltseer Captain'], horde: [] },
  },
  {
    id: 'krol-dok-stronghold',
    name: 'Krol\'dok Stronghold',
    dungeonSlugs: ['krol-dok-stronghold'],
    // Titel noch aus der Beta (englisch)
    quests: { alliance: ['Eye of Mugg', 'Twilight Mementos', 'Tome of Twilight', 'Vengeance of the Highborne'], horde: [] },
  },
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
