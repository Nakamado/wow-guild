import { findDungeon, instances } from '#shared/data/dungeons'
import type { GuildInfo } from '#shared/types'
import type { CharacterProvider, DiscordEventProvider, DiscordMemberProvider, DungeonCatalogProvider, GroupRepository, GuildProvider, TwitchProvider } from '../types'

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

/**
 * Live-Betrieb ohne Zugangsdaten für eine Quelle: leere Ergebnisse statt Beispieldaten,
 * damit auf der echten Seite nie fiktive Mitglieder, Clips oder Events erscheinen.
 */
export function createOffProviders(channel: string) {
  const members: DiscordMemberProvider = { listGuildMembers: async () => [], getMember: async () => null }
  const characters: CharacterProvider = { list: async () => [], listByMember: async () => [], get: async () => null }
  const discordEvents: DiscordEventProvider = { listScheduledEvents: async () => [] }
  const groups: GroupRepository = { list: async () => [], get: async () => null }
  const twitch: TwitchProvider = {
    getStreamStatus: async () => ({ channel, isLive: false, title: null, gameName: null, viewerCount: null, startedAt: null, checkedAt: new Date().toISOString() }),
    listClips: async () => [],
    listStreamers: async () => [],
  }
  return { members, characters, discordEvents, groups, twitch }
}
