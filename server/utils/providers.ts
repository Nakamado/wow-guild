import { createProviders, type ProviderConfig, type ProviderModeInfo } from '../providers/registry'
import type { ProviderKey, Providers } from '../providers/types'

/**
 * Zugriff auf die Datenquellen in Server-Routen: `const { dungeons } = useProviders()`.
 *
 * Die Instanzen werden pro UTC-Tag gecacht: So bleiben relative Demo-Termine aktuell,
 * ohne den Datensatz bei jeder Anfrage neu zu erzeugen.
 */
let cache: { day: string, providers: Providers, modes: Record<ProviderKey, ProviderModeInfo> } | null = null
let loggedModes = false

export function useProviders(): Providers {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  if (cache?.day !== day) {
    const { providers, modes } = createProviders(readProviderConfig(), { now })
    cache = { day, providers, modes }
    logModes(modes)
  }
  return cache.providers
}

export function useProviderModes(): Record<ProviderKey, ProviderModeInfo> {
  useProviders()
  return cache!.modes
}

function readProviderConfig(): ProviderConfig {
  const config = useRuntimeConfig()
  return {
    demoMode: Boolean(config.public.demoMode),
    guild: {
      name: config.public.guild.name,
      realm: config.public.guild.realm,
      faction: config.public.guild.faction === 'horde' ? 'horde' : 'alliance',
      discordInvite: config.public.guild.discordInvite,
      description: '',
    },
    discord: {
      botToken: config.discord.botToken,
      guildId: config.discord.guildId,
      memberRoleId: config.discord.memberRoleId,
    },
    twitch: {
      clientId: config.twitch.clientId,
      clientSecret: config.twitch.clientSecret,
      broadcasterId: config.public.twitch.broadcasterId,
      channel: config.public.twitch.channel,
    },
    supabase: {
      url: config.supabase.url,
      serviceRoleKey: config.supabase.serviceRoleKey,
    },
  }
}

/** Einmalig protokollieren, welche Quelle aktiv ist – nur Variablennamen, nie Werte. */
function logModes(modes: Record<ProviderKey, ProviderModeInfo>) {
  if (loggedModes) return
  loggedModes = true
  const summary = Object.entries(modes)
    .map(([key, info]) => `${key}=${info.mode}${info.mode === 'demo' && info.reason !== 'demo-mode' ? ` (${info.reason}${info.missing.length ? `: ${info.missing.join(', ')}` : ''})` : ''}`)
    .join(' · ')
  console.info(`[providers] ${summary}`)
}
