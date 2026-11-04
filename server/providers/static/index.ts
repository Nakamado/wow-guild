import { dungeons, findDungeon } from '#shared/data/dungeons'
import type { GuildInfo } from '#shared/types'
import type { DungeonCatalogProvider, GuildProvider } from '../types'

/** Dungeon-Katalog aus statischen, quellenbelegten Daten (Demo und Live identisch). */
export function createStaticDungeonProvider(): DungeonCatalogProvider {
  return {
    async list() {
      return dungeons.map(dungeon => ({ ...dungeon }))
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
