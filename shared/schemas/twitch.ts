import { z } from 'zod'
import { IdSchema, IsoDateTimeSchema } from './common'

export const StreamStatusSchema = z.object({
  channel: z.string().min(1),
  isLive: z.boolean(),
  title: z.string().nullable(),
  gameName: z.string().nullable(),
  viewerCount: z.number().int().min(0).nullable(),
  startedAt: IsoDateTimeSchema.nullable(),
  /**
   * Vorschaubild des laufenden Streams (Twitch-CDN, 640×360). Wird über den eigenen Server
   * ausgeliefert (NuxtImg), der Browser lädt nichts direkt von Twitch. null = keins (z. B. Demo).
   */
  thumbnailUrl: z.url().nullable().optional(),
  /** Zeitpunkt der letzten Prüfung – UI zeigt nie einen veralteten Livestatus als sicher an */
  checkedAt: IsoDateTimeSchema,
})

export const ClipSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  /** null bei Demo-Clips */
  url: z.url().nullable(),
  embedUrl: z.url().nullable(),
  thumbnailUrl: z.url().nullable(),
  creatorName: z.string().min(1),
  broadcasterName: z.string().min(1),
  viewCount: z.number().int().min(0),
  durationSeconds: z.number().min(0),
  createdAt: IsoDateTimeSchema,
})

export const ClipPeriodSchema = z.enum(['7d', '30d', 'all'])
export const ClipSortSchema = z.enum(['recent', 'popular'])

export const StreamerSchema = z.object({
  id: IdSchema,
  twitchId: z.string().min(1),
  login: z.string().min(1),
  displayName: z.string().min(1),
  avatarUrl: z.url().nullable(),
  /** Nur explizit konfigurierte Zuordnung – nie per Namensähnlichkeit */
  memberId: IdSchema.nullable(),
  isLive: z.boolean(),
})
