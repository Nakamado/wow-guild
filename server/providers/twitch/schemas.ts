import { z } from 'zod'

/**
 * Rohformate der Twitch Helix API – nur genutzte Felder.
 * https://dev.twitch.tv/docs/api/reference/
 */
export const TwitchTokenSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
})

export const HelixStreamSchema = z.object({
  user_id: z.string(),
  user_login: z.string(),
  user_name: z.string(),
  game_name: z.string().nullish(),
  type: z.string(),
  title: z.string().nullish(),
  started_at: z.string(),
  /** Vorschaubild mit Platzhaltern {width}x{height} */
  thumbnail_url: z.string().nullish(),
})

export const HelixClipSchema = z.object({
  id: z.string(),
  url: z.url(),
  embed_url: z.url(),
  broadcaster_name: z.string(),
  creator_name: z.string(),
  title: z.string(),
  view_count: z.number().int().nonnegative(),
  created_at: z.string(),
  thumbnail_url: z.string(),
  duration: z.number().nonnegative(),
  /** Twitch-Kategorie des Clips (leer bei sehr alten Clips) */
  game_id: z.string().default(''),
})

export const HelixGameSchema = z.object({
  id: z.string(),
  name: z.string(),
})

/** Helix-Antwort mit Seitenzeiger (für mehrere Seiten Clips) */
export const helixPage = <T extends z.ZodType>(item: T) => z.object({
  data: z.array(item),
  pagination: z.object({ cursor: z.string().optional() }).partial().default({}),
})

export const HelixUserSchema = z.object({
  id: z.string(),
  login: z.string(),
  display_name: z.string(),
  profile_image_url: z.string().nullish(),
})

export const helixList = <T extends z.ZodType>(item: T) => z.object({ data: z.array(item) })

export type HelixStream = z.infer<typeof HelixStreamSchema>
export type HelixClip = z.infer<typeof HelixClipSchema>
export type HelixUser = z.infer<typeof HelixUserSchema>
