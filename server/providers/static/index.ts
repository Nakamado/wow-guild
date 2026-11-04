import { findDungeon, instances } from '#shared/data/dungeons'
import type { GuildInfo } from '#shared/types'
import type { DungeonCatalogProvider, GuildProvider } from '../types'

/** Instanz-Katalog (Dungeons und Raids) aus statischen, quellenbelegten Daten (Demo und Live identisch). */
export function createStaticDungeonProvider(): DungeonCatalogProvider {
  return {
    async list() {
      return instances.map(dungeon => ({ ...dungeon }))
    },
    async get(slug) {
      const dungeon = findDungeon(slug)
      return dungeon ? { ...dungeon } : null
    },
  }
}

/** Gildeninfos aus der Konfiguration (Name, Realm, Fraktion, Discord-Link). */
export function createConfigGuildProvider(info: GuildInfo): GuildProvider {
  return {
    async getInfo() {
      return { ...info }
    },
  }
}
