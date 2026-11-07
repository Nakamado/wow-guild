import { createDemoDataset } from '../../data/demo'
import type { GuildInfo } from '#shared/types'
import {
  createDemoCharacterProvider,
  createDemoDiscordEventProvider,
  createDemoGroupRepository,
  createDemoMemberProvider,
  createDemoTwitchProvider,
} from './demo'
import { createConfigGuildProvider, createOffProviders, createStaticDungeonProvider } from './static'
import type { ProviderKey, Providers } from './types'

/** Server-Konfiguration, unabhängig von Nuxt – damit die Registry rein testbar bleibt. */
export interface ProviderConfig {
  demoMode: boolean
  guild: GuildInfo
  discord: { botToken: string, guildId: string, memberRoleId: string, adminRoleId: string }
  twitch: { clientId: string, clientSecret: string, broadcasterId: string, channel: string }
  supabase: { url: string, serviceRoleKey: string }
}

/**
 * - static: gleiche Daten in Demo und Live (Dungeons, Gildeninfos)
 * - demo:   fiktive Beispieldaten (nur im Demo-Modus)
 * - live:   echte Quelle
 * - off:    Live-Betrieb ohne Zugangsdaten → leer statt Beispieldaten (nie Fake-Daten auf der echten Seite)
 */
export type ProviderMode = 'static' | 'demo' | 'live' | 'off'

export type ProviderModeReason
  = | 'static-data' // gleiche Daten in Demo und Live
    | 'demo-mode' // Demo-Modus global aktiv
    | 'missing-credentials' // Live gewünscht, Zugangsdaten fehlen
    | 'not-implemented' // Live-Provider existiert noch nicht
    | 'configured' // Live aktiv

export interface ProviderModeInfo {
  mode: ProviderMode
  reason: ProviderModeReason
  /** Namen der fehlenden Umgebungsvariablen (niemals Werte) */
  missing: string[]
}

export type LiveFactories = { [K in ProviderKey]?: (config: ProviderConfig) => Providers[K] }

const staticProviders: ProviderKey[] = ['dungeons', 'guild']

type Requirement = Record<string, string>

/**
 * Welche Zugangsdaten braucht welcher Live-Provider? (Variablenname → Wert)
 * Mehrere Einträge = Alternativen; die erste vollständige gewinnt.
 */
function requirements(config: ProviderConfig): Record<Exclude<ProviderKey, 'dungeons' | 'guild'>, Requirement[]> {
  const supabase = {
    NUXT_SUPABASE_URL: config.supabase.url,
    NUXT_SUPABASE_SERVICE_ROLE_KEY: config.supabase.serviceRoleKey,
  }
  return {
    members: [
      // Alle, die sich schon einmal auf der Seite angemeldet haben (Supabase) …
      supabase,
      // … nur ohne Datenbank: vollständige Rollenliste über den Discord-Bot
      {
        NUXT_DISCORD_BOT_TOKEN: config.discord.botToken,
        NUXT_DISCORD_GUILD_ID: config.discord.guildId,
        NUXT_DISCORD_MEMBER_ROLE_ID: config.discord.memberRoleId,
      },
    ],
    discordEvents: [{
      NUXT_DISCORD_BOT_TOKEN: config.discord.botToken,
      NUXT_DISCORD_GUILD_ID: config.discord.guildId,
    }],
    twitch: [{
      NUXT_TWITCH_CLIENT_ID: config.twitch.clientId,
      NUXT_TWITCH_CLIENT_SECRET: config.twitch.clientSecret,
      NUXT_PUBLIC_TWITCH_BROADCASTER_ID: config.twitch.broadcasterId,
    }],
    characters: [supabase],
    groups: [supabase],
  }
}

const missingIn = (requirement: Requirement) =>
  Object.entries(requirement).filter(([, value]) => !String(value ?? '').trim()).map(([name]) => name)

/**
 * Mitgliederliste über den Discord-Bot? Nur ohne Datenbank – mit Supabase erscheinen bewusst nur
 * Mitglieder, die sich auf der Seite angemeldet haben (der Bot liest dann nur Events und prüft Rollen).
 */
export function hasDiscordBot(config: ProviderConfig): boolean {
  const [supabase, bot] = requirements(config).members
  return missingIn(supabase!).length > 0 && missingIn(bot!).length === 0
}

/**
 * Entscheidet je Provider über Demo oder Live.
 * Fehlende Zugangsdaten betreffen nur den jeweiligen Provider – der Rest läuft live weiter.
 */
export function resolveProviderModes(
  config: ProviderConfig,
  liveAvailable: readonly ProviderKey[],
): Record<ProviderKey, ProviderModeInfo> {
  const required = requirements(config)
  const result = {} as Record<ProviderKey, ProviderModeInfo>

  for (const key of staticProviders) result[key] = { mode: 'static', reason: 'static-data', missing: [] }

  for (const key of Object.keys(required) as (keyof typeof required)[]) {
    const options = required[key].map(missingIn)
    const complete = options.some(list => list.length === 0)
    const missing = complete ? [] : options[0]!
    if (config.demoMode) result[key] = { mode: 'demo', reason: 'demo-mode', missing }
    else if (!complete) result[key] = { mode: 'off', reason: 'missing-credentials', missing }
    else if (!liveAvailable.includes(key)) result[key] = { mode: 'off', reason: 'not-implemented', missing }
    else result[key] = { mode: 'live', reason: 'configured', missing }
  }

  return result
}

export interface CreateProvidersOptions {
  now?: Date
  liveFactories?: LiveFactories
  simulateLive?: boolean
}

export function createProviders(config: ProviderConfig, options: CreateProvidersOptions = {}) {
  const liveFactories = options.liveFactories ?? {}
  const modes = resolveProviderModes(config, Object.keys(liveFactories) as ProviderKey[])

  // Demo-Datensatz nur erzeugen, wenn ihn mindestens ein Provider braucht
  const needsDemo = Object.values(modes).some(info => info.mode === 'demo')
  const demo = needsDemo
    ? createDemoDataset(options.now, { twitchChannel: config.twitch.channel, simulateLive: options.simulateLive })
    : null

  const off = createOffProviders(config.twitch.channel)

  function pick<K extends ProviderKey>(key: K, demoFactory: () => Providers[K]): Providers[K] {
    const factory = liveFactories[key]
    if (modes[key].mode === 'live' && factory) return factory(config)
    if (modes[key].mode === 'off') return off[key as keyof typeof off] as Providers[K]
    return demoFactory()
  }

  const providers: Providers = {
    dungeons: createStaticDungeonProvider(),
    guild: createConfigGuildProvider(config.guild),
    members: pick('members', () => createDemoMemberProvider(demo!)),
    characters: pick('characters', () => createDemoCharacterProvider(demo!)),
    discordEvents: pick('discordEvents', () => createDemoDiscordEventProvider(demo!)),
    twitch: pick('twitch', () => createDemoTwitchProvider(demo!)),
    groups: pick('groups', () => createDemoGroupRepository(demo!)),
  }

  return { providers, modes }
}
