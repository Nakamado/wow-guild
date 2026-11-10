import type { GroupRun, GuildEvent } from '#shared/types'
import { findDungeon } from '#shared/data/dungeons'
import { createDiscordBotClient, type DiscordBotClient } from '../providers/discord/client'
import { guildEventAnnouncement, runAnnouncement, runThreadLines, runThreadName } from '../providers/discord/announcements'

/**
 * Discord-Ankündigungen: neue Gruppen und Gilden-Events landen als eine Nachricht im Channel
 * (NUXT_DISCORD_ANNOUNCE_CHANNEL_ID), die bei Änderungen bearbeitet wird. Gruppen bekommen
 * einen Thread für An-/Abmeldungen. Alles „best effort“: Fehler bei Discord werden nur geloggt,
 * die Aktion auf der Webseite klappt trotzdem. Ohne Channel-ID, Bot-Token oder Datenbank: nichts.
 */

let cachedBot: { token: string, client: DiscordBotClient } | null = null

function setup() {
  const config = useRuntimeConfig()
  const channelId = String(config.discord.announceChannelId || '').trim()
  const token = String(config.discord.botToken || '')
  const store = useAnnouncementStore()
  if (config.public.demoMode || !/^\d{5,25}$/.test(channelId) || !token || !store) return null
  if (cachedBot?.token !== token) cachedBot = { token, client: createDiscordBotClient(token) }
  return { channelId, bot: cachedBot.client, store, siteUrl: siteBase() }
}

async function attempt(label: string, task: () => Promise<void>) {
  try {
    await task()
  }
  catch (error) {
    console.warn(`[discord-announce] ${label}: ${error instanceof Error ? error.message : 'unbekannt'}`)
  }
}

/** Charakternamen zu IDs (für Thread-Zeilen) */
async function characterNames(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  await Promise.all([...new Set(ids)].map(async (id) => {
    const character = await useProviders().characters.get(id).catch(() => null)
    if (character) names.set(id, character.name)
  }))
  return names
}

/** Neue Gruppe ankündigen (Nachricht + Thread) */
export async function announceRunCreated(run: GroupRun): Promise<void> {
  const ctx = setup()
  if (!ctx) return
  await attempt(`Gruppe ${run.id} ankündigen`, async () => {
    const dungeon = findDungeon(run.dungeonSlug)
    const messageId = await ctx.bot.createMessage(ctx.channelId, runAnnouncement(run, dungeon, ctx.siteUrl))
    let hasThread = false
    try {
      await ctx.bot.startThread(ctx.channelId, messageId, runThreadName(run, dungeon))
      hasThread = true
    }
    catch (error) {
      console.warn(`[discord-announce] Thread für Gruppe ${run.id} nicht erstellt: ${error instanceof Error ? error.message : 'unbekannt'}`)
    }
    await ctx.store.save('run', run.id, { channelId: ctx.channelId, messageId, hasThread })
  })
}

/** Gruppe geändert (An-/Abmeldung, Bearbeitung, Absage): Nachricht aktualisieren, Zeilen in den Thread */
export async function syncRunAnnouncement(before: GroupRun, after: GroupRun): Promise<void> {
  const ctx = setup()
  if (!ctx) return
  await attempt(`Gruppe ${after.id} aktualisieren`, async () => {
    const announcement = await ctx.store.get('run', after.id)
    if (!announcement) return
    const dungeon = findDungeon(after.dungeonSlug)
    await ctx.bot.editMessage(announcement.channelId, announcement.messageId, runAnnouncement(after, dungeon, ctx.siteUrl))
    if (!announcement.hasThread) return
    const changed = [...before.participants, ...before.waitlist, ...after.participants, ...after.waitlist].map(entry => entry.characterId)
    const names = await characterNames(changed)
    const lines = runThreadLines(before, after, id => names.get(id))
    if (lines.length) {
      await ctx.bot.createMessage(announcement.messageId, { content: lines.join('\n').slice(0, 2000), allowed_mentions: { parse: [] } })
    }
  })
}

/** Gruppe gelöscht: Nachricht entfernen (und den Thread, falls der Bot das darf) */
export async function removeRunAnnouncement(run: GroupRun): Promise<void> {
  await removeAnnouncement('run', run.id)
}

export async function announceGuildEventCreated(event: GuildEvent): Promise<void> {
  const ctx = setup()
  if (!ctx) return
  await attempt(`Gilden-Event ${event.id} ankündigen`, async () => {
    const messageId = await ctx.bot.createMessage(ctx.channelId, guildEventAnnouncement(event, ctx.siteUrl))
    await ctx.store.save('guild_event', event.id, { channelId: ctx.channelId, messageId, hasThread: false })
  })
}

export async function syncGuildEventAnnouncement(event: GuildEvent): Promise<void> {
  const ctx = setup()
  if (!ctx) return
  await attempt(`Gilden-Event ${event.id} aktualisieren`, async () => {
    const announcement = await ctx.store.get('guild_event', event.id)
    if (announcement) await ctx.bot.editMessage(announcement.channelId, announcement.messageId, guildEventAnnouncement(event, ctx.siteUrl))
  })
}

export async function removeGuildEventAnnouncement(event: GuildEvent): Promise<void> {
  await removeAnnouncement('guild_event', event.id)
}

async function removeAnnouncement(type: 'run' | 'guild_event', id: string) {
  const ctx = setup()
  if (!ctx) return
  await attempt(`Ankündigung ${type} ${id} löschen`, async () => {
    const announcement = await ctx.store.get(type, id)
    if (!announcement) return
    await ctx.bot.deleteMessage(announcement.channelId, announcement.messageId)
    if (announcement.hasThread) {
      // braucht „Threads verwalten“ – ohne das Recht bleibt der Thread stehen, das ist in Ordnung
      await ctx.bot.deleteChannel(announcement.messageId).catch(() => undefined)
    }
    await ctx.store.remove(type, id)
  })
}
