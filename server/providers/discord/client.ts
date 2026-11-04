import { z } from 'zod'
import { requestJson, type FetchLike } from '../../lib/http'
import {
  DiscordGuildMemberSchema,
  DiscordScheduledEventSchema,
  type DiscordGuildMember,
  type DiscordScheduledEvent,
} from './schemas'

export const DISCORD_API = 'https://discord.com/api/v10'

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
