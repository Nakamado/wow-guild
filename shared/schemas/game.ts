import { z } from 'zod'
import { FactionSchema, LevelSchema, RoleIdSchema, SlugSchema } from './common'

/**
 * Klassen, Völker und Dungeons sind bewusst Daten statt Enums:
 * WoW: Forever erweitert sie laufend (neue Völker, Kombinationen, Dungeons).
 */
export const GameClassSchema = z.object({
  id: SlugSchema,
  name: z.string().min(1),
  nameEn: z.string().min(1),
  /** Rollen, die diese Klasse in Gruppen übernehmen kann */
  roles: z.array(RoleIdSchema).min(1),
  sourceIds: z.array(SlugSchema).min(1),
})

export const RaceSchema = z.object({
  id: SlugSchema,
  name: z.string().min(1),
  nameEn: z.string().min(1),
  /** Spielbare Klassen je Fraktion – ein Volk kann (wie die Himmelsgeborenen) beiden angehören */
  classesByFaction: z.partialRecord(FactionSchema, z.array(SlugSchema).min(1)),
  isNewInForever: z.boolean(),
  sourceIds: z.array(SlugSchema).min(1),
})

export const LevelRangeSchema = z
  .object({ min: LevelSchema, max: LevelSchema })
  .refine(range => range.min <= range.max, { message: 'min darf nicht größer als max sein' })

export const DungeonSchema = z.object({
  slug: SlugSchema,
  /** Deutscher Name; bei neuen Forever-Dungeons ohne bekannten deutschen Namen = englischer Name */
  name: z.string().min(1),
  nameEn: z.string().min(1),
  abbreviation: z.string().min(1).max(12),
  description: z.string(),
  zone: z.string().min(1),
  kind: z.enum(['dungeon', 'raid']),
  /** Empfohlener Levelbereich */
  levelRange: LevelRangeSchema,
  /** Mindeststufe zum Betreten; null = nicht belegt */
  minLevel: LevelSchema.nullable(),
  groupSize: z.number().int().min(1).max(40),
  isNewInForever: z.boolean(),
  image: z.string().nullable(),
  /** Hinweis, z. B. zur Erreichbarkeit für die Allianz */
  note: z.string().nullable(),
  sourceIds: z.array(SlugSchema).min(1),
})
