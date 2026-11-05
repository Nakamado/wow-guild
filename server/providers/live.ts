import type { SupabaseClient } from '@supabase/supabase-js'
import { guildStreamers, type StreamerEntry } from '../../content/streamers'
import { createSupabase, createSupabaseCharacterRepository, createSupabaseGroupRepository } from '../repositories/supabase'
import { createDiscordBotClient, createDiscordEventProvider, createDiscordMemberProvider } from './discord'
import type { LiveFactories, ProviderConfig } from './registry'
import { createTwitchClient, createTwitchProvider } from './twitch'
import type { DiscordEventProvider, DiscordMemberProvider, TwitchProvider, Writers } from './types'
import { serviceUnavailable, withFallback } from '../lib/resilience'

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
    members: config => resilientMembers(createDiscordMemberProvider(getBot(config), config.discord)),
    discordEvents: config => resilientEvents(createDiscordEventProvider(getBot(config), config.discord)),
    twitch: config => resilientTwitch(createTwitchProvider(
      createTwitchClient(config.twitch.clientId, config.twitch.clientSecret),
      { broadcasterId: config.twitch.broadcasterId, channel: config.twitch.channel, streamers: options.streamers ?? guildStreamers },
    ), config.twitch.channel),
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

/** Livestatus fällt auf „offline“ zurück, Streamer auf eine leere Liste, Clips melden sich als nicht verfügbar. */
export function resilientTwitch(provider: TwitchProvider, channel: string): TwitchProvider {
  return {
    getStreamStatus: withFallback(provider.getStreamStatus, {
      label: 'twitch.status',
      fallback: () => ({ channel, isLive: false, title: null, gameName: null, viewerCount: null, startedAt: null, checkedAt: new Date().toISOString() }),
    }),
    listClips: withFallback(provider.listClips, {
      label: 'twitch.clips',
      fallback: () => serviceUnavailable('Die Clips sind gerade nicht erreichbar. Bitte versuche es später erneut.'),
    }),
    listStreamers: withFallback(provider.listStreamers, { label: 'twitch.streamers', fallback: () => [] }),
  }
}

/** Kalender zeigt bei Discord-Ausfall weiterhin die Gruppen dieser Seite. */
export function resilientEvents(provider: DiscordEventProvider): DiscordEventProvider {
  return { listScheduledEvents: withFallback(provider.listScheduledEvents, { label: 'discord.events', fallback: () => [] }) }
}

export function resilientMembers(provider: DiscordMemberProvider): DiscordMemberProvider {
  const unavailable = () => serviceUnavailable('Die Mitgliederliste ist gerade nicht erreichbar. Bitte versuche es später erneut.')
  return {
    listGuildMembers: withFallback(provider.listGuildMembers, { label: 'discord.members', fallback: unavailable }),
    getMember: withFallback(provider.getMember, { label: 'discord.members', fallback: unavailable }),
  }
}
