import { classifySupabaseKey, normalizeSupabaseUrl } from '../lib/supabase-config'
import { createLiveFactories } from '../providers/live'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabase } from '../repositories/supabase'
import { createSupabaseAccountStore, type AccountStore } from '../repositories/supabase/accounts'
import { createSupabaseActivityStore, type ActivityStore } from '../repositories/supabase/activity'
import { createSupabaseBoardStore, type BoardStore } from '../repositories/supabase/board'
import { createSupabaseGrantStore, type GrantStore } from '../repositories/supabase/grants'
import { createSupabaseGuildEventStore, type GuildEventStore } from '../repositories/supabase/guild-events'
import { createSupabaseMemberSettingsStore, type MemberSettingsStore } from '../repositories/supabase/member-settings'
import { createSupabaseMilestoneStore, type MilestoneStore } from '../repositories/supabase/milestones'
import { createSupabaseQuestCatalog, type QuestCatalogStore } from '../repositories/supabase/quest-catalog'
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

let database: { key: string, db: SupabaseClient } | null = null
const stores = new Map<string, unknown>()

/** Supabase-Client für den Server – null im Demo-Modus oder ohne Datenbank */
function useDatabase(): SupabaseClient | null {
  const config = readProviderConfig()
  if (config.demoMode || !config.supabase.url || !config.supabase.serviceRoleKey) return null
  const key = `${config.supabase.url}:${config.supabase.serviceRoleKey.slice(-6)}`
  if (database?.key !== key) {
    database = { key, db: createSupabase(config.supabase.url, config.supabase.serviceRoleKey) }
    stores.clear()
  }
  return database.db
}

function useStore<T>(name: string, create: (db: SupabaseClient) => T): T | null {
  const db = useDatabase()
  if (!db) return null
  if (!stores.has(name)) stores.set(name, create(db))
  return stores.get(name) as T
}

/**
 * Schwarzes Brett in Supabase – null im Demo-Modus oder ohne Datenbank
 * (dann zeigt die Seite Beispiel-Aushänge bzw. nichts).
 */
export function useBoardStore(): BoardStore | null {
  return useStore('board', createSupabaseBoardStore)
}

/** Gilden-Events (auf der Webseite eingetragene Termine) – null im Demo-Modus oder ohne Datenbank */
export function useGuildEventStore(): GuildEventStore | null {
  return useStore('guild-events', createSupabaseGuildEventStore)
}

/** Einstellungen der Mitglieder (Ranglisten-Zustimmung, Twitch-Kanal) – null ohne Datenbank */
export function useMemberSettingsStore(): MemberSettingsStore | null {
  return useStore('member-settings', createSupabaseMemberSettingsStore)
}

/** Konten (Webseitenrolle, Datenschutzhinweis, Löschen, Adminliste) – null ohne Datenbank */
export function useAccountStore(): AccountStore | null {
  return useStore('accounts', createSupabaseAccountStore)
}

/** Aktivitätsprotokoll – null ohne Datenbank */
export function useActivityStore(): ActivityStore | null {
  return useStore('activity', createSupabaseActivityStore)
}

/** Ranglistenfreigaben durch den Hauptadmin – null ohne Datenbank */
export function useGrantStore(): GrantStore | null {
  return useStore('grants', createSupabaseGrantStore)
}

/** Quest-Katalog (einmal nachgeschlagene Questdaten) – null ohne Datenbank */
export function useQuestCatalogStore(): QuestCatalogStore | null {
  return useStore('quest-catalog', createSupabaseQuestCatalog)
}

/** Automatisch erkannte Chronik-Meilensteine – null ohne Datenbank */
export function useMilestoneStore(): MilestoneStore | null {
  return useStore('milestones', createSupabaseMilestoneStore)
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
