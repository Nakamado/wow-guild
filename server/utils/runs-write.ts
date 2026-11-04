import { z } from 'zod'
import type { H3Event } from 'h3'

const ParamsSchema = z.object({ id: z.string().min(1).max(64) })

export async function loadRunForWrite(event: H3Event) {
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const run = await useProviders().groups.get(id)
  if (!run) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diese Gruppe gibt es nicht (mehr).' })
  return run
}
