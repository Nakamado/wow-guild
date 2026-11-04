import { z } from 'zod'

/** Höchststufe in WoW: Forever */
export const MAX_LEVEL = 60

/** Kebab-case-Bezeichner für Datensätze (Klassen, Völker, Dungeons …) */
export const SlugSchema = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Ungültiger Bezeichner (kebab-case erwartet)')

export const IdSchema = z.string().min(1).max(64)

export const FactionSchema = z.enum(['alliance', 'horde'])

/** Spielrollen in Gruppen */
export const RoleIdSchema = z.enum(['tank', 'healer', 'dps'])

/** ISO-8601-Zeitpunkt mit Zeitzone (in der DB als timestamptz/UTC) */
export const IsoDateTimeSchema = z.iso.datetime({ offset: true })

export const LevelSchema = z.number().int().min(1).max(MAX_LEVEL)

/** Herkunft eines Datensatzes – wird in der UI für Transparenz angezeigt */
export const DataSourceSchema = z.enum(['demo', 'self', 'discord', 'twitch', 'blizzard', 'static'])

/** Quelle für statische Spieldaten (Nachvollziehbarkeit) */
export const SourceRefSchema = z.object({
  id: SlugSchema,
  title: z.string().min(1),
  url: z.url(),
  /** Datum des Abrufs (YYYY-MM-DD) */
  accessedAt: z.iso.date(),
})
