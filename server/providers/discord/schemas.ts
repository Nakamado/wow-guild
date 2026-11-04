import { z } from 'zod'

/**
 * Rohformate der Discord-API (v10) – nur die Felder, die wir nutzen.
 * https://discord.com/developers/docs/resources/user
 * https://discord.com/developers/docs/resources/guild#guild-member-object
 * https://discord.com/developers/docs/resources/guild-scheduled-event
 */
export const DiscordUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  global_name: z.string().nullish(),
  avatar: z.string().nullish(),
  bot: z.boolean().optional(),
})

export const DiscordGuildMemberSchema = z.object({
  user: DiscordUserSchema.optional(),
  nick: z.string().nullish(),
  avatar: z.string().nullish(),
  roles: z.array(z.string()),
  joined_at: z.string().nullish(),
})

/** 1 = geplant, 2 = aktiv, 3 = abgeschlossen, 4 = abgesagt */
export const DiscordScheduledEventSchema = z.object({
  id: z.string(),
  guild_id: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  scheduled_start_time: z.string(),
  scheduled_end_time: z.string().nullish(),
  status: z.number().int(),
  creator: DiscordUserSchema.nullish(),
})

export type DiscordUser = z.infer<typeof DiscordUserSchema>
export type DiscordGuildMember = z.infer<typeof DiscordGuildMemberSchema>
export type DiscordScheduledEvent = z.infer<typeof DiscordScheduledEventSchema>
