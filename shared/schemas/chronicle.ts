import { z } from 'zod'
import { SlugSchema } from './common'

/**
 * Meilenstein der Gilden-Chronik („Unsere Geschichte“).
 * Quellen: manuell (content/chronicle.ts), Blizzard-API, Guild-Tracker-Addon.
 */
export const MilestoneCategorySchema = z.enum(['community', 'dungeon', 'raid', 'achievement', 'custom'])
export const MilestoneSourceSchema = z.enum(['manual', 'blizzard-api', 'addon'])

/** Kalendertag (YYYY-MM-DD) oder exakter Zeitpunkt (ISO mit Zeitzone) */
export const MilestoneDateSchema = z.union([z.iso.date(), z.iso.datetime({ offset: true })])

export const GuildMilestoneSchema = z.object({
  /** Stabil und eindeutig, z. B. „2026-11-15-erster-raid“ oder „members-25“ */
  id: SlugSchema,
  /**
   * Stabiler Ereignistyp, z. B. `guild.founded`, `members.threshold`, `level.first`, `profession.first-max`,
   * `dungeon.first-group`, `raid.first`, `raid.first-boss`, `custom`.
   */
  type: z.string().regex(/^[a-z]+(\.[a-z-]+)*$/),
  title: z.string().min(1).max(100),
  description: z.string().max(600).optional(),
  category: MilestoneCategorySchema,
  source: MilestoneSourceSchema,
  /**
   * Wann es passiert ist. Bei automatisch erkannten Meilensteinen nur, wenn die Quelle das
   * echte Datum liefert – sonst null und `detectedAt` gilt (nie das Abfragedatum als Erfolgsdatum ausgeben).
   */
  occurredAt: MilestoneDateSchema.nullable(),
  /** Wann die Webseite den Meilenstein erstmals erkannt hat (nur automatische Einträge) */
  detectedAt: MilestoneDateSchema.optional(),
  /**
   * Doppelte vermeiden: gleicher Schlüssel = derselbe Meilenstein (z. B. `members.threshold:25`).
   * Manuelle Einträge mit gleichem Schlüssel haben Vorrang vor automatischen.
   */
  dedupeKey: z.string().max(100).optional(),
  icon: z.string().max(30).optional(),
  image: z.object({ src: z.string().min(1), alt: z.string().min(1).max(200) }).optional(),
  /** Beteiligte Charaktere (IDs) – Verlinkung folgt später */
  characterIds: z.array(z.string()).max(40).optional(),
  /** Besonders hervorheben (größere Darstellung) */
  highlight: z.boolean().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  /** Beispieldaten – werden sichtbar als Demo gekennzeichnet */
  isDemo: z.boolean().optional(),
})

export type GuildMilestone = z.infer<typeof GuildMilestoneSchema>
export type MilestoneCategory = z.infer<typeof MilestoneCategorySchema>
