import type { Dungeon } from '../types'
import { raids } from './raids'

/**
 * Dungeon-Katalog für WoW: Forever.
 *
 * - Deutsche Namen und Levelbereiche: Dungeon-Journal im Spiel (deutscher Client, Stand 06.11.2026).
 *   Noch nicht veröffentlichte Dungeons („Demnächst“) heißen dort englisch – deutsche Namen nachtragen,
 *   sobald sie erscheinen.
 * - Mindeststufen & Gruppengrößen der Classic-Dungeons: Classic-Übersicht
 *   (warcrafttavern-classic-dungeons) – in Forever nicht separat belegt.
 * - Neue Forever-Dungeons: Mindeststufe unbekannt → `null`, Gruppengröße 5
 *   (warcrafttavern-forever-new-dungeons).
 * - Raids folgen mit der Raidplanung (Phase 5).
 */

const JOURNAL = 'ingame-dungeon-journal-de'
const FOREVER = 'warcrafttavern-forever-dungeons'
const CLASSIC = 'warcrafttavern-classic-dungeons'
const NEW = 'warcrafttavern-forever-new-dungeons'

const SOON = 'Im Spiel noch nicht verfügbar – im Dungeon-Journal als „Demnächst“ markiert.'
const HORDE_TERRITORY = 'Liegt in Hordengebiet – Anreise für die Allianz beachten.'

interface ClassicInput {
  slug: string
  name: string
  nameEn: string
  abbreviation: string
  description: string
  zone: string
  range: [number, number]
  minLevel: number
  groupSize?: number
  note?: string
}

interface NewInput {
  slug: string
  /** deutscher Name laut Dungeon-Journal; fehlt bei noch nicht veröffentlichten Dungeons („Demnächst“) */
  name?: string
  nameEn: string
  abbreviation: string
  zone: string
  range: [number, number]
  note?: string
}

function classic(input: ClassicInput): Dungeon {
  return {
    slug: input.slug,
    name: input.name,
    nameEn: input.nameEn,
    abbreviation: input.abbreviation,
    description: input.description,
    zone: input.zone,
    kind: 'dungeon',
    levelRange: { min: input.range[0], max: input.range[1] },
    minLevel: input.minLevel,
    groupSize: input.groupSize ?? 5,
    isNewInForever: false,
    image: null,
    note: input.note ?? null,
    sourceIds: [JOURNAL, FOREVER, CLASSIC],
  }
}

function forever(input: NewInput): Dungeon {
  return {
    slug: input.slug,
    name: input.name ?? input.nameEn,
    nameEn: input.nameEn,
    abbreviation: input.abbreviation,
    description: 'Neuer Dungeon in WoW: Forever.',
    zone: input.zone,
    kind: 'dungeon',
    levelRange: { min: input.range[0], max: input.range[1] },
    minLevel: null,
    groupSize: 5,
    isNewInForever: true,
    image: null,
    note: input.note ?? null,
    sourceIds: [JOURNAL, FOREVER, NEW],
  }
}

export const dungeons: readonly Dungeon[] = [
  classic({ slug: 'ragefire-chasm', name: 'Der Flammenschlund', nameEn: 'Ragefire Chasm', abbreviation: 'RFC', description: 'Lavahöhlen unter Orgrimmar.', zone: 'Orgrimmar', range: [13, 18], minLevel: 8, note: 'Liegt in der Hauptstadt der Horde – für die Allianz praktisch nicht erreichbar.' }),
  forever({ slug: 'hall-of-thanes', name: 'Halle der Thane', nameEn: 'Hall of Thanes', abbreviation: 'HoT', zone: 'Eisenschmiede', range: [13, 20] }),
  forever({ slug: 'ruins-of-lordaeron', name: 'Ruinen von Lordaeron', nameEn: 'Ruins of Lordaeron', abbreviation: 'RoL', zone: 'Tirisfal', range: [15, 22], note: HORDE_TERRITORY }),
  classic({ slug: 'wailing-caverns', name: 'Die Höhlen des Wehklagens', nameEn: 'Wailing Caverns', abbreviation: 'WC', description: 'Verzweigtes Höhlensystem im Brachland.', zone: 'Brachland', range: [15, 24], minLevel: 10 }),
  classic({ slug: 'the-deadmines', name: 'Die Todesminen', nameEn: 'The Deadmines', abbreviation: 'DM', description: 'Versteck der Defias-Bruderschaft unter Westfall.', zone: 'Westfall', range: [17, 26], minLevel: 10 }),
  classic({ slug: 'shadowfang-keep', name: 'Burg Schattenfang', nameEn: 'Shadowfang Keep', abbreviation: 'SFK', description: 'Verfluchte Burg im Silberwald.', zone: 'Silberwald', range: [20, 30], minLevel: 10, note: HORDE_TERRITORY }),
  classic({ slug: 'blackfathom-deeps', name: 'Tiefschwarze Grotte', nameEn: 'Blackfathom Deeps', abbreviation: 'BFD', description: 'Überflutete Tempelanlage an der Küste des Eschentals.', zone: 'Eschental', range: [24, 32], minLevel: 10 }),
  classic({ slug: 'the-stockade', name: 'Das Verlies', nameEn: 'The Stockade', abbreviation: 'Stocks', description: 'Gefängnis mitten in Sturmwind.', zone: 'Sturmwind', range: [24, 32], minLevel: 15 }),
  forever({ slug: 'excavation-site-wetlands', name: 'Ausgrabungsstätte: Sumpfland', nameEn: 'Excavation Site: Wetlands', abbreviation: 'ES', zone: 'Sumpfland', range: [26, 33] }),
  forever({ slug: 'city-of-dalaran', name: 'Stadt Dalaran', nameEn: 'City of Dalaran', abbreviation: 'CoD', zone: 'Alteracgebirge', range: [28, 33] }),
  classic({ slug: 'gnomeregan', name: 'Gnomeregan', nameEn: 'Gnomeregan', abbreviation: 'Gnomer', description: 'Verseuchte Hauptstadt der Gnome.', zone: 'Dun Morogh', range: [29, 38], minLevel: 15 }),
  classic({ slug: 'razorfen-kraul', name: 'Kral der Klingenhauer', nameEn: 'Razorfen Kraul', abbreviation: 'RFK', description: 'Dornenlabyrinth der Stacheleber im südlichen Brachland.', zone: 'Brachland', range: [29, 38], minLevel: 15 }),
  classic({ slug: 'scarlet-monastery-graveyard', name: 'Scharlachrotes Kloster: Friedhof', nameEn: 'Scarlet Monastery – Graveyard', abbreviation: 'SM GY', description: 'Friedhof des Scharlachroten Klosters.', zone: 'Tirisfal', range: [30, 38], minLevel: 20, note: HORDE_TERRITORY }),
  classic({ slug: 'scarlet-monastery-library', name: 'Scharlachrotes Kloster: Bibliothek', nameEn: 'Scarlet Monastery – Library', abbreviation: 'SM Lib', description: 'Bibliothek des Scharlachroten Klosters.', zone: 'Tirisfal', range: [33, 41], minLevel: 20, note: HORDE_TERRITORY }),
  forever({ slug: 'the-drowned-city', nameEn: 'The Drowned City', abbreviation: 'DC', zone: 'Schlingendorntal', range: [35, 40], note: SOON }),
  classic({ slug: 'scarlet-monastery-armory', name: 'Scharlachrotes Kloster: Waffenkammer', nameEn: 'Scarlet Monastery – Armory', abbreviation: 'SM Arm', description: 'Waffenkammer des Scharlachroten Klosters.', zone: 'Tirisfal', range: [34, 42], minLevel: 20, note: HORDE_TERRITORY }),
  classic({ slug: 'razorfen-downs', name: 'Hügel von Razorfen', nameEn: 'Razorfen Downs', abbreviation: 'RFD', description: 'Hügelgräber der Stacheleber im südlichen Brachland.', zone: 'Brachland', range: [37, 46], minLevel: 25 }),
  classic({ slug: 'scarlet-monastery-cathedral', name: 'Scharlachrotes Kloster: Kathedrale', nameEn: 'Scarlet Monastery – Cathedral', abbreviation: 'SM Cath', description: 'Kathedrale des Scharlachroten Klosters.', zone: 'Tirisfal', range: [36, 45], minLevel: 20, note: HORDE_TERRITORY }),
  classic({ slug: 'uldaman', name: 'Uldaman', nameEn: 'Uldaman', abbreviation: 'Uld', description: 'Titanische Ausgrabungsstätte im Ödland.', zone: 'Ödland', range: [38, 48], minLevel: 30 }),
  classic({ slug: 'zulfarrak', name: 'Zul\'Farrak', nameEn: 'Zul\'Farrak', abbreviation: 'ZF', description: 'Trollstadt in der Wüste von Tanaris.', zone: 'Tanaris', range: [43, 50], minLevel: 35 }),
  forever({ slug: 'krol-dok-stronghold', nameEn: 'Krol\'dok Stronghold', abbreviation: 'KDS', zone: 'Riverglades', range: [40, 45], note: SOON }),
  classic({ slug: 'maraudon', name: 'Maraudon', nameEn: 'Maraudon', abbreviation: 'Mara', description: 'Höhlen der Zentauren und Elementare in Desolace.', zone: 'Desolace', range: [45, 52], minLevel: 30 }),
  forever({ slug: 'alcaz-island-prison', nameEn: 'Alcaz Prison', abbreviation: 'Alcaz', zone: 'Düstermarschen', range: [48, 53], note: SOON }),
  classic({ slug: 'temple-of-atal-hakkar', name: 'Versunkener Tempel', nameEn: 'Temple of Atal\'Hakkar', abbreviation: 'ST', description: 'Versunkener Trolltempel in den Sümpfen des Elends.', zone: 'Sümpfe des Elends', range: [49, 56], minLevel: 35 }),
  classic({ slug: 'blackrock-depths', name: 'Blackrocktiefen', nameEn: 'Blackrock Depths', abbreviation: 'BRD', description: 'Stadt der Dunkeleisenzwerge im Schwarzfels.', zone: 'Der Schwarzfels', range: [52, 60], minLevel: 40 }),
  classic({ slug: 'lower-blackrock-spire', name: 'Untere Blackrockspitze', nameEn: 'Lower Blackrock Spire', abbreviation: 'LBRS', description: 'Untere Ebenen der Blackrockspitze.', zone: 'Der Schwarzfels', range: [55, 60], minLevel: 45 }),
  classic({ slug: 'upper-blackrock-spire', name: 'Obere Blackrockspitze', nameEn: 'Upper Blackrock Spire', abbreviation: 'UBRS', description: 'Obere Ebenen der Blackrockspitze.', zone: 'Der Schwarzfels', range: [55, 60], minLevel: 45, groupSize: 10 }),
  classic({ slug: 'dire-maul-east', name: 'Düsterbruch: Ost', nameEn: 'Dire Maul – East', abbreviation: 'DM East', description: 'Ostflügel der Elfenruinen in Feralas.', zone: 'Feralas', range: [55, 60], minLevel: 45 }),
  classic({ slug: 'dire-maul-west', name: 'Düsterbruch: West', nameEn: 'Dire Maul – West', abbreviation: 'DM West', description: 'Westflügel der Elfenruinen in Feralas.', zone: 'Feralas', range: [57, 60], minLevel: 45 }),
  classic({ slug: 'dire-maul-north', name: 'Düsterbruch: Nord', nameEn: 'Dire Maul – North', abbreviation: 'DM North', description: 'Nordflügel der Elfenruinen in Feralas.', zone: 'Feralas', range: [57, 60], minLevel: 45 }),
  forever({ slug: 'blackmaw-hold', nameEn: 'Blackmaw Hold', abbreviation: 'BMH', zone: 'Azshara', range: [55, 60], note: SOON }),
  forever({ slug: 'shapers-terrace', nameEn: 'Shaper\'s Terrace', abbreviation: 'Terrace', zone: 'Krater von Un\'Goro', range: [58, 60], note: SOON }),
  classic({ slug: 'stratholme-living', name: 'Stratholme: Lebend', nameEn: 'Stratholme – Living', abbreviation: 'Strat Live', description: 'Scharlachrot besetzter Teil der zerstörten Stadt.', zone: 'Östliche Pestländer', range: [58, 60], minLevel: 45 }),
  classic({ slug: 'stratholme-undead', name: 'Stratholme: Untot', nameEn: 'Stratholme – Undead', abbreviation: 'Strat UD', description: 'Von der Geißel beherrschter Teil der zerstörten Stadt.', zone: 'Östliche Pestländer', range: [58, 60], minLevel: 45 }),
  classic({ slug: 'scholomance', name: 'Scholomance', nameEn: 'Scholomance', abbreviation: 'Scholo', description: 'Akademie der Nekromantie auf Caer Darrow.', zone: 'Westliche Pestländer', range: [58, 60], minLevel: 45 }),
]

/** Alle planbaren Instanzen: Dungeons und Raids */
export const instances: readonly Dungeon[] = [...dungeons, ...raids]

/** Sucht eine Instanz (Dungeon oder Raid) per Slug. */
export function findDungeon(slug: string, catalog: readonly Dungeon[] = instances): Dungeon | undefined {
  return catalog.find(dungeon => dungeon.slug === slug)
}
