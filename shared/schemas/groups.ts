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
  /** Gesetzt, wenn der Run per Bot als Discord-Event angekündigt wurde (Duplikatvermeidung) */
  discordEventId: z.string().nullable(),
  createdAt: IsoDateTimeSchema,
  updatedAt: IsoDateTimeSchema,
})
