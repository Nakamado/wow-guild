import type { CommunityMember, DiscordEvent, EventStatus } from '#shared/types'
import type { DiscordGuildMember, DiscordScheduledEvent, DiscordUser } from './schemas'

const CDN = 'https://cdn.discordapp.com'

/** Avatar-URL: Server-Avatar > Profil-Avatar > Discord-Standardavatar */
export function discordAvatarUrl(user: DiscordUser, guildId?: string, memberAvatar?: string | null): string {
  if (memberAvatar && guildId) return `${CDN}/guilds/${guildId}/users/${user.id}/avatars/${memberAvatar}.png?size=128`
  if (user.avatar) return `${CDN}/avatars/${user.id}/${user.avatar}.png?size=128`
  // Standardavatar für Konten mit neuem Benutzernamen-System: (id >> 22) % 6
  const index = Number((BigInt(user.id) >> 22n) % 6n)
  return `${CDN}/embed/avatars/${index}.png`
}

export function discordDisplayName(user: DiscordUser, nick?: string | null): string {
  return nick || user.global_name || user.username
}

export function memberToCommunityMember(
  member: DiscordGuildMember,
  config: { guildId: string, memberRoleId: string, adminRoleId: string },
): CommunityMember | null {
  if (!member.user || member.user.bot) return null
  const { user } = member
  return {
    id: user.id,
    discordId: user.id,
    displayName: discordDisplayName(user, member.nick),
    avatarUrl: discordAvatarUrl(user, config.guildId, member.avatar),
    profileUrl: `https://discord.com/users/${user.id}`,
    preferredRoles: [],
    isGuildMember: Boolean(config.memberRoleId) && member.roles.includes(config.memberRoleId),
    isAdmin: Boolean(config.adminRoleId) && member.roles.includes(config.adminRoleId),
    source: 'discord',
  }
}

const statusMap: Record<number, EventStatus> = { 1: 'scheduled', 2: 'active', 3: 'completed', 4: 'cancelled' }

export function scheduledEventToDiscordEvent(event: DiscordScheduledEvent): DiscordEvent {
  return {
    id: event.id,
    title: event.name,
    description: event.description ?? '',
    startsAt: new Date(event.scheduled_start_time).toISOString(),
    endsAt: event.scheduled_end_time ? new Date(event.scheduled_end_time).toISOString() : null,
    status: statusMap[event.status] ?? 'scheduled',
    organizerName: event.creator ? discordDisplayName(event.creator) : null,
    url: `https://discord.com/events/${event.guild_id}/${event.id}`,
  }
}
