import { z } from 'zod'
import { IdSchema, IsoDateTimeSchema } from './common'

/**
 * Schwarzes Brett: kurze Aushänge der Admins („100 Fische für den Raid gesucht“).
 * Nur für Gildenmitglieder sichtbar; erstellen, bearbeiten und entfernen nur Admins.
 */
export const BoardNoteSchema = z.object({
  id: IdSchema,
  title: z.string().trim().min(1).max(80),
  text: z.string().trim().max(400).nullable(),
  /** letzter Tag, an dem der Aushang sichtbar ist (YYYY-MM-DD, Berliner Zeit); null = bis er entfernt wird */
  expiresOn: z.iso.date().nullable(),
  createdBy: IdSchema,
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
  /** fiktiver Beispiel-Aushang (Demo-Modus) */
  isDemo: z.boolean().default(false),
})

export const BoardNoteInputSchema = z.object({
  title: z.string().trim().min(1, 'Bitte einen Titel eingeben.').max(80, 'Der Titel darf höchstens 80 Zeichen lang sein.'),
  text: z.string().trim().max(400, 'Der Text darf höchstens 400 Zeichen lang sein.').transform(value => value || null).nullable().default(null),
  expiresOn: z.union([z.iso.date(), z.literal('')]).transform(value => value || null).nullable().default(null),
})
