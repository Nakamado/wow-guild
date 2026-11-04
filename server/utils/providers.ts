import { createLiveFactories } from '../providers/live'
import { createProviders, type ProviderConfig, type ProviderModeInfo } from '../providers/registry'
import type { ProviderKey, Providers, Writers } from '../providers/types'

/**
 * Zugriff auf die Datenquellen in Server-Routen: `const { dungeons } = useProviders()`.
 *
 * Die Instanzen werden pro UTC-Tag gecacht: So bleiben relative Demo-Termine aktuell,
 * ohne den Datensatz bei jeder Anfrage neu zu erzeugen.
 */
let cache: {
  day: string
  providers: Providers
  modes: Record<ProviderKey, ProviderModeInfo>
  writers: Writers | null
} | null = null
let loggedModes = false

export function useProviders(): Providers {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  if (cache?.day !== day) {
    const live = createLiveFactories()
    const { providers, modes } = createProviders(readProviderConfig(), { now, liveFactories: live.factories })
    cache = { day, providers, modes, writers: live.writers() }
    logModes(modes)
  }
  return cache.providers
}

export function useProviderModes(): Record<ProviderKey, ProviderModeInfo> {
  useProviders()
  return cache!.modes
}

/**
 * Schreibzugriffe (Runs, Charaktere) – nur wenn Supabase live ist.
 * Im Demo-Modus speichert der Browser Änderungen selbst (sessionStorage).
 */
export function useWriters(): Writers {
  useProviders()
  if (cache!.writers) return cache!.writers
  throw createError({
    statusCode: 409,
    statusMessage: 'Conflict',
    message: useRuntimeConfig().public.demoMode
      ? 'Im Demo-Modus werden Änderungen nur im Browser gespeichert.'
      : 'Speichern ist gerade nicht möglich: Die Datenbank ist nicht eingerichtet.',
  })
}

/**
 * Umgebungsvariablen kommen nicht zwingend als Text an: Nitro wandelt kurze Zahlen
 * (z. B. NUXT_PUBLIC_TWITCH_BROADCASTER_ID=114422810) automatisch in Numbers um.
 */
const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim())

function readProviderConfig(): ProviderConfig {
  const config = useRuntimeConfig()
  return {
    demoMode: Boolean(config.public.demoMode),
    guild: {
      name: text(config.public.guild.name),
      realm: text(config.public.guild.realm),
      faction: config.public.guild.faction === 'horde' ? 'horde' : 'alliance',
      discordInvite: text(config.public.guild.discordInvite),
      description: '',
    },
    discord: {
      botToken: text(config.discord.botToken),
      guildId: text(config.discord.guildId),
      memberRoleId: text(config.discord.memberRoleId),
      adminRoleId: text(config.discord.adminRoleId),
    },
    twitch: {
      clientId: text(config.twitch.clientId),
      clientSecret: text(config.twitch.clientSecret),
      broadcasterId: text(config.public.twitch.broadcasterId),
      channel: text(config.public.twitch.channel),
    },
    supabase: {
      url: text(config.supabase.url),
      serviceRoleKey: text(config.supabase.serviceRoleKey),
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
