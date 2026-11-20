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
  /** Aufzeichnung auf Twitch (nur vergangene Events, solange Twitch das VOD noch hat) */
  vodUrl: z.url().nullable().optional(),
  /** Ort bei externen Discord-Events (z. B. Twitch-Link) */
  location: z.string().nullable().optional(),
  /** Auf der Webseite als abgesagt markiert (Discord selbst weiß davon nichts) */
  siteCancelled: z.boolean().optional(),
  /** automatisch abgesagt: Stream-Event ohne passende Übertragung auf Twitch */
  autoCancelled: z.boolean().optional(),
  cancelReason: z.string().nullable().optional(),
})

/** Einheitliches Kalender-Event aus beiden Quellen, mit stabiler ID */
export const CalendarEventSchema = z.object({
  /** `discord:<id>`, `site:<runId>` oder `guild:<guildEventId>` */
  id: z.string().regex(/^(discord|site|guild):.+$/),
  /** discord = Discord-Event, site = Gruppe, guild = auf der Webseite eingetragenes Gilden-Event */
  source: z.enum(['discord', 'site', 'guild']),
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
  /** nur Gilden-Events: ID und Treffpunkt */
  guildEventId: IdSchema.nullable().default(null),
  location: z.string().nullable().default(null),
  /** Grund der Absage (Gruppen und Gilden-Events) */
  cancelReason: z.string().nullable().default(null),
  /** nur Discord-Events: Aufzeichnung auf Twitch */
  vodUrl: z.url().nullable().default(null),
  /** nur Discord-Events: auf der Webseite abgesagt (kann zurückgenommen werden) */
  siteCancelled: z.boolean().default(false),
})
