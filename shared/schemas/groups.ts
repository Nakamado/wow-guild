import { z } from 'zod'
import { IdSchema, IsoDateTimeSchema, RoleIdSchema, SlugSchema } from './common'

/** Plätze je Rolle */
export const RoleCapacitySchema = z.object({
  tank: z.number().int().min(0),
  healer: z.number().int().min(0),
  dps: z.number().int().min(0),
})

export const ParticipantSchema = z.object({
  memberId: IdSchema,
  characterId: IdSchema,
  role: RoleIdSchema,
  joinedAt: IsoDateTimeSchema,
  /** Supporter: hilft aus, macht aber Platz, wenn sich jemand fest anmeldet */
  support: z.boolean().optional(),
})

/** „voll“ wird nicht gespeichert, sondern aus der Besetzung abgeleitet */
export const RunStatusSchema = z.enum(['open', 'cancelled', 'completed'])

/** Dungeon- oder Raid-Gruppe, die auf der Webseite geplant wird (führende Quelle: Webseite/DB) */
export const GroupRunSchema = z.object({
  id: IdSchema,
  dungeonSlug: SlugSchema,
  title: z.string().max(80).nullable(),
  description: z.string().max(500),
  startsAt: IsoDateTimeSchema,
  organizerId: IdSchema,
  status: RunStatusSchema,
  capacity: RoleCapacitySchema,
  participants: z.array(ParticipantSchema),
  waitlistEnabled: z.boolean(),
  waitlist: z.array(ParticipantSchema),
  /** Optional: Dungeon-Quests, die die Gruppe erledigen will (Quest-IDs aus dem Dungeon Journal) */
  questIds: z.array(z.number().int().positive()).max(30).optional(),
  /** Gesetzt, wenn der Run per Bot als Discord-Event angekündigt wurde (Duplikatvermeidung) */
  discordEventId: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})

/** Eingabe beim Erstellen/Bearbeiten eines Runs (Fachregeln: validateRunDraft) */
export const RunInputSchema = z.object({
  dungeonSlug: SlugSchema,
  title: z.string().trim().max(80).nullable().transform(value => value || null),
  description: z.string().trim().max(500),
  startsAt: IsoDateTimeSchema,
  capacity: RoleCapacitySchema,
  waitlistEnabled: z.boolean(),
  /** geplante Dungeon-Quests (optional, leer = keine Angabe) */
  questIds: z.array(z.number().int().positive()).max(30).default([]),
})

export const JoinInputSchema = z.object({
  characterId: IdSchema,
  role: RoleIdSchema,
  /** als Supporter anmelden (macht Platz für feste Anmeldungen) */
  support: z.boolean().default(false),
})
