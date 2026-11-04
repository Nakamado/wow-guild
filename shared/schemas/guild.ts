import { z } from 'zod'
import { FactionSchema } from './common'

export const GuildInfoSchema = z.object({
  name: z.string().min(1),
  realm: z.string().min(1),
  faction: FactionSchema,
  discordInvite: z.url(),
  description: z.string(),
})

export const GuildStatsSchema = z.object({
  memberCount: z.number().int().min(0),
  characterCount: z.number().int().min(0),
  /** Anzahl Charaktere je Klassen-ID */
  classDistribution: z.record(z.string(), z.number().int().min(0)),
  averageLevel: z.number().min(0),
  maxLevelCount: z.number().int().min(0),
  upcomingRunCount: z.number().int().min(0),
})
