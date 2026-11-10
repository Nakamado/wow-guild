import { z } from 'zod'
import { requestJson, type FetchLike } from '../../lib/http'
import {
  DiscordGuildMemberSchema,
  DiscordScheduledEventSchema,
  type DiscordGuildMember,
  type DiscordScheduledEvent,
} from './schemas'

export const DISCORD_API = 'https://discord.com/api/v10'

/** Nachricht für die Bot-API – Erwähnungen werden immer ohne Ping gesendet */
export interface DiscordMessageBody {
  content?: string
  embeds?: unknown[]
  components?: unknown[]
  allowed_mentions: { parse: readonly [] }
}

const DiscordMessageRefSchema = z.object({ id: z.string() })

async function ignoreNotFound(request: Promise<unknown>) {
  try {
    await request
  }
  catch (error) {
    if (error instanceof Error && 'status' in error && error.status === 404) return
    throw error
  }
}

export interface DiscordClientOptions {
  fetch?: FetchLike
  sleep?: (ms: number) => Promise<void>
}

/** Discord-API mit Bot-Token (Mitgliederliste, Scheduled Events, Rollenprüfung). */
export function createDiscordBotClient(botToken: string, options: DiscordClientOptions = {}) {
  const headers = {
    'Authorization': `Bot ${botToken}`,
    'User-Agent': 'DiscordBot (https://github.com/Nakamado/wow-guild, 1.0)',
  }
  const get = <T>(path: string) => requestJson<T>(`${DISCORD_API}${path}`, { headers }, { service: 'discord', ...options })
  /** Schreibzugriffe mit kurzer Zeitgrenze – sie laufen während einer Nutzeraktion mit */
  const send = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) => requestJson<T>(
    `${DISCORD_API}${path}`,
    {
      method,
      headers: body === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    },
    { service: 'discord', ...options, maxRetryDelay: 2000 },
  )

  return {
    /**
     * Alle Mitglieder des Servers (paginiert, 1000 pro Seite).
     * Benötigt den privilegierten „Server Members Intent“ für den Bot.
     */
    async listGuildMembers(guildId: string, maxPages = 20): Promise<DiscordGuildMember[]> {
      const members: DiscordGuildMember[] = []
      let after = '0'
      for (let page = 0; page < maxPages; page++) {
        const raw = await get<unknown>(`/guilds/${guildId}/members?limit=1000&after=${after}`)
        const batch = z.array(DiscordGuildMemberSchema).parse(raw)
        members.push(...batch)
        const last = batch.at(-1)?.user?.id
        if (batch.length < 1000 || !last) break
        after = last
      }
      return members
    },

    /** Ein Mitglied (für die serverseitige Rollen-Nachprüfung). null, wenn nicht auf dem Server. */
    async getGuildMember(guildId: string, userId: string): Promise<DiscordGuildMember | null> {
      try {
        return DiscordGuildMemberSchema.parse(await get<unknown>(`/guilds/${guildId}/members/${userId}`))
      }
      catch (error) {
        if (error instanceof Error && 'status' in error && error.status === 404) return null
        throw error
      }
    },

    async listScheduledEvents(guildId: string): Promise<DiscordScheduledEvent[]> {
      const raw = await get<unknown>(`/guilds/${guildId}/scheduled-events`)
      return z.array(DiscordScheduledEventSchema).parse(raw)
    },

    // ── Ankündigungen (Rechte im Channel: Nachrichten senden, Links einbetten, Threads) ──

    /** Nachricht in einen Channel oder Thread posten; liefert die Nachrichten-ID */
    async createMessage(channelId: string, message: DiscordMessageBody): Promise<string> {
      const raw = await send<unknown>('POST', `/channels/${channelId}/messages`, message)
      return DiscordMessageRefSchema.parse(raw).id
    },

    /** Eigene Nachricht bearbeiten */
    async editMessage(channelId: string, messageId: string, message: DiscordMessageBody): Promise<void> {
      await send('PATCH', `/channels/${channelId}/messages/${messageId}`, message)
    },

    /** Eigene Nachricht löschen (404 = schon weg, gilt als erledigt) */
    async deleteMessage(channelId: string, messageId: string): Promise<void> {
      await ignoreNotFound(send('DELETE', `/channels/${channelId}/messages/${messageId}`))
    },

    /** Thread an einer Nachricht starten – die Thread-ID ist dann gleich der Nachrichten-ID */
    async startThread(channelId: string, messageId: string, name: string): Promise<void> {
      await send('POST', `/channels/${channelId}/messages/${messageId}/threads`, { name: name.slice(0, 100), auto_archive_duration: 10080 })
    },

    /** Thread löschen (braucht „Threads verwalten“ – ohne das Recht bleibt er einfach stehen) */
    async deleteChannel(channelId: string): Promise<void> {
      await ignoreNotFound(send('DELETE', `/channels/${channelId}`))
    },
  }
}

/** Mitgliedschaft des angemeldeten Nutzers per OAuth-Token (Scope `guilds.members.read`). */
export async function fetchOwnGuildMember(
  accessToken: string,
  guildId: string,
  options: DiscordClientOptions = {},
): Promise<DiscordGuildMember | null> {
  try {
    const raw = await requestJson<unknown>(
      `${DISCORD_API}/users/@me/guilds/${guildId}/member`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
      { service: 'discord', ...options },
    )
    return DiscordGuildMemberSchema.parse(raw)
  }
  catch (error) {
    // 404: Nutzer ist nicht auf dem Server
    if (error instanceof Error && 'status' in error && error.status === 404) return null
    throw error
  }
}

export type DiscordBotClient = ReturnType<typeof createDiscordBotClient>
