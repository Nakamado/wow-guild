import { classifySupabaseKey, normalizeSupabaseUrl } from '../lib/supabase-config'
import { createLiveFactories } from '../providers/live'
import { createSupabase } from '../repositories/supabase'
import { createSupabaseBoardStore, type BoardStore } from '../repositories/supabase/board'
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
  memberStore: ReturnType<ReturnType<typeof createLiveFactories>['memberStore']>
} | null = null
let loggedModes = false

export function useProviders(): Providers {
  const now = new Date()
  const day = now.toISOString().slice(0, 10)
  if (cache?.day !== day) {
    const live = createLiveFactories()
    const { providers, modes } = createProviders(readProviderConfig(), { now, liveFactories: live.factories })
    cache = { day, providers, modes, writers: live.writers(), memberStore: live.memberStore() }
    logModes(modes)
  }
  return cache.providers
}

export function useProviderModes(): Record<ProviderKey, ProviderModeInfo> {
  useProviders()
  return cache!.modes
}

/**
 * Angemeldete Mitglieder speichern (Name, Avatar, Gildenrolle). Fehler werden nur geloggt –
 * der Login darf daran nicht scheitern.
 */
export async function rememberMember(snapshot: Parameters<NonNullable<NonNullable<typeof cache>['memberStore']>['save']>[0]) {
  useProviders()
  const store = cache!.memberStore
  if (!store) return
  try {
    await store.save(snapshot)
  }
  catch (error) {
    console.warn(`[members] Profil nicht gespeichert: ${error instanceof Error ? error.message : 'unbekannt'}`)
  }
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

let boardStore: { key: string, store: BoardStore } | null = null

/**
 * Schwarzes Brett in Supabase – null im Demo-Modus oder ohne Datenbank
 * (dann zeigt die Seite Beispiel-Aushänge bzw. nichts).
 */
export function useBoardStore(): BoardStore | null {
  const config = readProviderConfig()
  if (config.demoMode || !config.supabase.url || !config.supabase.serviceRoleKey) return null
  const key = `${config.supabase.url}:${config.supabase.serviceRoleKey.slice(-6)}`
  if (boardStore?.key !== key) boardStore = { key, store: createSupabaseBoardStore(createSupabase(config.supabase.url, config.supabase.serviceRoleKey)) }
  return boardStore.store
}

/**
 * Umgebungsvariablen kommen nicht zwingend als Text an: Nitro wandelt kurze Zahlen
 * (z. B. NUXT_PUBLIC_TWITCH_BROADCASTER_ID=114422810) automatisch in Numbers um.
 */
const text = (value: unknown) => (value === undefined || value === null ? '' : String(value).trim())

/** Öffentliche Keys dürfen dank RLS nichts schreiben – lieber deutlich melden als später scheitern. */
function checkedSupabaseKey(key: string): string {
  if (key && classifySupabaseKey(key) === 'public') {
    console.error('[supabase] NUXT_SUPABASE_SERVICE_ROLE_KEY ist ein öffentlicher Key (publishable/anon). Bitte den Secret- bzw. service_role-Key eintragen – Supabase bleibt bis dahin aus.')
    return ''
  }
  return key
}

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
      url: normalizeSupabaseUrl(text(config.supabase.url)),
      serviceRoleKey: checkedSupabaseKey(text(config.supabase.serviceRoleKey)),
    },
  }
}

/** Einmalig protokollieren, welche Quelle aktiv ist – nur Variablennamen, nie Werte. */
function logModes(modes: Record<ProviderKey, ProviderModeInfo>) {
  if (loggedModes) return
  loggedModes = true
  const summary = Object.entries(modes)
    .map(([key, info]) => `${key}=${info.mode}${info.mode === 'off' ? ` (${info.reason}${info.missing.length ? `: ${info.missing.join(', ')}` : ''})` : ''}`)
    .join(' · ')
  console.info(`[providers] ${summary}`)
}
