import { z } from 'zod'
import { IdSchema, IsoDateTimeSchema } from './common'

export const EventStatusSchema = z.enum(['scheduled', 'active', 'completed', 'cancelled'])

/** Normalisiertes Discord Scheduled Event (führende Quelle: Discord) */
export const DiscordEventSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  status: EventStatusSchema,
  organizerName: z.string().nullable(),
  url: z.url().nullable(),
})

/** Einheitliches Kalender-Event aus beiden Quellen, mit stabiler ID */
export const CalendarEventSchema = z.object({
  /** `discord:<id>` oder `site:<runId>` */
  id: z.string().regex(/^(discord|site):.+$/),
  source: z.enum(['discord', 'site']),
  type: z.enum(['dungeon', 'raid', 'community']),
  title: z.string().min(1),
  description: z.string(),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  status: EventStatusSchema,
  organizerName: z.string().nullable(),
  url: z.url().nullable(),
  runId: IdSchema.nullable(),
  /** Freie Plätze (nur Webseiten-Events) */
  openSlots: z.number().int().min(0).nullable(),
})
