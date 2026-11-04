import { z } from 'zod'
import { ClipPeriodSchema, ClipSortSchema } from '#shared/schemas/twitch'

const QuerySchema = z.object({
  period: ClipPeriodSchema.default('30d'),
  sort: ClipSortSchema.default('recent'),
  limit: z.coerce.number().int().min(1).max(50).default(12),
})

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  return useProviders().twitch.listClips(query)
})
