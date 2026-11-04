import type { DiscordEventProvider, DiscordMemberProvider } from '../types'
import { createTtlCache } from '../../lib/http'
import type { DiscordBotClient } from './client'
import { memberToCommunityMember, scheduledEventToDiscordEvent } from './normalize'

export { createDiscordBotClient, fetchOwnGuildMember } from './client'

export interface DiscordProviderConfig {
  guildId: string
  memberRoleId: string
  adminRoleId: string
}

const MEMBERS_TTL = 5 * 60_000
const EVENTS_TTL = 2 * 60_000

/** Live-Mitgliederliste: alle Träger der Rolle „WoW Forever“ (nie die komplette Serverliste). */
export function createDiscordMemberProvider(client: DiscordBotClient, config: DiscordProviderConfig): DiscordMemberProvider {
  const cache = createTtlCache()
  const load = () =>
    cache.get('members', MEMBERS_TTL, async () =>
      (await client.listGuildMembers(config.guildId))
        .map(member => memberToCommunityMember(member, config))
        .filter(member => member !== null),
    )

  return {
    async listGuildMembers() {
      return (await load()).filter(member => member.isGuildMember)
    },
    async getMember(id) {
      return (await load()).find(member => member.id === id) ?? null
    },
  }
}

export function createDiscordEventProvider(client: DiscordBotClient, config: Pick<DiscordProviderConfig, 'guildId'>): DiscordEventProvider {
  const cache = createTtlCache()
  return {
    async listScheduledEvents() {
      return cache.get('events', EVENTS_TTL, async () =>
        (await client.listScheduledEvents(config.guildId)).map(scheduledEventToDiscordEvent),
      )
    },
  }
}
