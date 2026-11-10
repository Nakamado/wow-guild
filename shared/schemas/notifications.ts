import { z } from 'zod'
import { IdSchema, IsoDateTimeSchema, RoleIdSchema } from './common'

/**
 * Arten von Benachrichtigungen (vorerst nur rund um Gruppen):
 * - run-joined / run-left: an die Organisation, wenn sich jemand an- oder abmeldet
 * - run-bumped: Supporter musste für eine feste Zusage auf die Warteliste
 * - run-relocated: Flex-Teilnahme wurde in die Ausweichrolle verschoben
 * - run-promoted: von der Warteliste nachgerückt
 * - run-rescheduled: Termin der Gruppe hat sich geändert
 * - run-cancelled / run-deleted: Gruppe abgesagt bzw. gelöscht
 */
export const NotificationKindSchema = z.enum([
  'run-joined',
  'run-left',
  'run-bumped',
  'run-relocated',
  'run-promoted',
  'run-rescheduled',
  'run-cancelled',
  'run-deleted',
])

/** Zusatzangaben je Benachrichtigung – bewusst klein und ohne Discord-Namen */
export const NotificationDataSchema = z.object({
  /** Titel der Gruppe zum Zeitpunkt der Benachrichtigung (bleibt auch nach dem Löschen lesbar) */
  runTitle: z.string().min(1).max(80),
  /** Charaktername der Person, die etwas ausgelöst hat (An-/Abmeldung) */
  characterName: z.string().max(40).optional(),
  role: RoleIdSchema.optional(),
  support: z.boolean().optional(),
  reason: z.string().max(200).optional(),
  startsAt: IsoDateTimeSchema.optional(),
})

export const NotificationSchema = z.object({
  id: IdSchema,
  kind: NotificationKindSchema,
  /** null bei gelöschten Gruppen */
  runId: IdSchema.nullable(),
  data: NotificationDataSchema,
  createdAt: IsoDateTimeSchema,
  readAt: IsoDateTimeSchema.nullable(),
})

export const NotificationListSchema = z.object({
  /** false im Demo-Modus (dort lokal) oder ohne Datenbank */
  available: z.boolean(),
  unread: z.number().int().min(0),
  items: z.array(NotificationSchema),
})

/** Als gelesen markieren: bestimmte IDs oder (ohne Angabe) alle */
export const MarkReadInputSchema = z.object({
  ids: z.array(IdSchema).max(100).optional(),
})
