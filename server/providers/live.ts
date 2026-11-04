import type { SupabaseClient } from '@supabase/supabase-js'
import { guildStreamers, type StreamerEntry } from '../../content/streamers'
import { createSupabase, createSupabaseCharacterRepository, createSupabaseGroupRepository } from '../repositories/supabase'
import { createDiscordBotClient, createDiscordEventProvider, createDiscordMemberProvider } from './discord'
import type { LiveFactories, ProviderConfig } from './registry'
import { createTwitchClient, createTwitchProvider } from './twitch'
import type { Writers } from './types'

/**
 * Baut die Live-Provider. Clients werden geteilt (ein Bot-Client für Mitglieder und Events,
 * eine Supabase-Verbindung für Lesen und Schreiben). Die Schreib-Repositories werden
 * nur befüllt, wenn die Registry Supabase tatsächlich live schaltet.
 */
export function createLiveFactories(options: { streamers?: StreamerEntry[] } = {}) {
  let bot: ReturnType<typeof createDiscordBotClient> | null = null
  let db: SupabaseClient | null = null
  const getBot = (config: ProviderConfig) => (bot ??= createDiscordBotClient(config.discord.botToken))
  const getDb = (config: ProviderConfig) => (db ??= createSupabase(config.supabase.url, config.supabase.serviceRoleKey))

  const writers: Partial<Writers> = {}

  const factories: LiveFactories = {
    members: config => createDiscordMemberProvider(getBot(config), config.discord),
    discordEvents: config => createDiscordEventProvider(getBot(config), config.discord),
    twitch: config => createTwitchProvider(
      createTwitchClient(config.twitch.clientId, config.twitch.clientSecret),
      { broadcasterId: config.twitch.broadcasterId, channel: config.twitch.channel, streamers: options.streamers ?? guildStreamers },
    ),
    characters: (config) => {
      const repository = createSupabaseCharacterRepository(getDb(config))
      writers.characters = repository
      return repository
    },
    groups: (config) => {
      const repository = createSupabaseGroupRepository(getDb(config))
      writers.groups = repository
      return repository
    },
  }

  return {
    factories,
    /** null, solange Charaktere und Runs nicht beide live gespeichert werden */
    writers: (): Writers | null => (writers.characters && writers.groups ? (writers as Writers) : null),
  }
}
