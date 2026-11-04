import type { SourceRef } from '../types'

/**
 * Quellen für statische Spieldaten. Jeder Datensatz verweist per `sourceIds` hierauf.
 * Beim Aktualisieren von Werten bitte `accessedAt` anpassen.
 */
export const dataSources = [
  {
    id: 'warcrafttavern-forever-dungeons',
    title: 'Warcraft Tavern – WoW Forever Dungeons',
    url: 'https://www.warcrafttavern.com/forever/guides/dungeons/',
    accessedAt: '2026-11-04',
  },
  {
    id: 'warcrafttavern-forever-new-dungeons',
    title: 'Warcraft Tavern – Nine New Dungeons Coming to World of Warcraft Forever (Fünfer-Gruppen)',
    url: 'https://www.warcrafttavern.com/news/nine-new-dungeons-coming-to-world-of-warcraft-forever/',
    accessedAt: '2026-11-04',
  },
  {
    id: 'warcrafttavern-classic-dungeons',
    title: 'Warcraft Tavern – WoW Classic Dungeons & Instances (Mindeststufen, Gruppengrößen)',
    url: 'https://www.warcrafttavern.com/guides/wow-classic-dungeons-instances/',
    accessedAt: '2026-11-04',
  },
  {
    id: 'blizzard-forever-raids',
    title: 'Blizzard – World of Warcraft: Forever Raid Overview (Locations, Raid Sizes, and Attunement)',
    url: 'https://worldofwarcraft.blizzard.com/news/24303009',
    accessedAt: '2026-11-04',
  },
  {
    id: 'warcrafttavern-forever-race-class',
    title: 'Warcraft Tavern – WoW Forever Race Class Combinations',
    url: 'https://www.warcrafttavern.com/forever/guides/race-class-combos/',
    accessedAt: '2026-11-04',
  },
  {
    id: 'community-role-convention',
    title: 'Gängige Rollenverteilung der Classic-Community (Paladine erhalten in Forever eine Spott-Fähigkeit)',
    url: 'https://www.pcgamer.com/games/world-of-warcraft/wow-forevers-list-of-changes-snowballed-as-blizzard-got-more-excited-says-dev-our-original-pitch-internally-was-well-do-4-new-dungeons/',
    accessedAt: '2026-11-04',
  },
] as const satisfies readonly SourceRef[]

export type DataSourceId = (typeof dataSources)[number]['id']
