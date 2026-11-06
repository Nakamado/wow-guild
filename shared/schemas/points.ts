import { z } from 'zod'

/** Fortschritts-Ereignisse, aus denen der Server Punkte berechnet (nie das Addon). */
export const ProgressTypeSchema = z.enum([
  'level', // Stufe erreicht (objectId = Stufe)
  'dungeon-first', // Erstabschluss eines Dungeons je Charakter (objectId = Dungeon-Slug)
  'dungeon-complete', // jeder Abschluss (objectId = Slug + laufende Nummer)
  'dungeon-quest', // Dungeon-Quest abgeschlossen (objectId = Quest-ID)
  'dungeon-boss', // Dungeon-Boss besiegt (wiederholbar)
  'raid-first', // Erstabschluss eines Raids je Charakter
  'raid-boss', // Raid-Boss besiegt (wiederholbar)
  'profession-milestone', // Berufsmeilenstein (objectId = Beruf:Stufe)
])

export const PointsRulesSchema = z.object({
  /** Version der Regeln – Ranglisten lassen sich jederzeit neu berechnen */
  version: z.number().int().positive(),
  points: z.record(ProgressTypeSchema, z.number().int().min(0).max(10_000)),
  /** Diese Typen sind wiederholbar und fallen unter das Wochenlimit */
  repeatable: z.array(ProgressTypeSchema),
  /** Höchstpunkte pro Woche und Discord-Mitglied für wiederholbare Aktivität */
  weeklyRepeatableCap: z.number().int().min(0),
  /** Wochenwechsel (Blizzard-Reset EU): Wochentag 0–6 (Mi = 3) und Stunde in UTC */
  weekReset: z.object({ weekday: z.number().int().min(0).max(6), hourUtc: z.number().int().min(0).max(23) }),
  /** Berufsstufen, die als Meilenstein zählen */
  professionMilestones: z.array(z.number().int().positive()),
})

export const ProgressEventSchema = z.object({
  memberId: z.string().min(1),
  characterId: z.string().min(1),
  type: ProgressTypeSchema,
  objectId: z.string().min(1),
  /** null = rückwirkend erkannt (kein echtes Datum) – zählt in keiner Woche */
  occurredAt: z.iso.datetime({ offset: true }).nullable(),
})

export type ProgressType = z.infer<typeof ProgressTypeSchema>
export type PointsRules = z.infer<typeof PointsRulesSchema>
export type ProgressEvent = z.infer<typeof ProgressEventSchema>
