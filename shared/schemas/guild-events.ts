import { z } from 'zod'
import { IdSchema, IsoDateTimeSchema } from './common'

/**
 * Gilden-Events: Termine, die Mitglieder direkt auf der Webseite eintragen (Gildentreffen,
 * Angelwettbewerb …) – ohne Discord-Event. Eintragen dürfen alle Gildenmitglieder,
 * bearbeiten und absagen die Person, die es eingetragen hat, sowie Admins.
 */
export const GuildEventStatusSchema = z.enum(['scheduled', 'cancelled'])

export const GuildEventSchema = z.object({
  id: IdSchema,
  title: z.string().trim().min(1).max(80),
  description: z.string().trim().max(1000),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable(),
  /** Treffpunkt im Spiel, z. B. „Eisenschmiede, Bank“ */
  location: z.string().trim().max(80).nullable(),
  status: GuildEventStatusSchema,
  /** Grund der Absage (optional) */
  cancelReason: z.string().max(200).nullable().optional(),
  createdBy: IdSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

export const GuildEventInputSchema = z.object({
  title: z.string().trim().min(1, 'Bitte einen Titel eingeben.').max(80, 'Der Titel darf höchstens 80 Zeichen lang sein.'),
  description: z.string().trim().max(1000, 'Die Beschreibung darf höchstens 1000 Zeichen lang sein.').default(''),
  startsAt: IsoDateTimeSchema,
  endsAt: IsoDateTimeSchema.nullable().default(null),
  location: z.string().trim().max(80, 'Der Treffpunkt darf höchstens 80 Zeichen lang sein.').transform(value => value || null).nullable().default(null),
})
