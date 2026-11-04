import { z } from 'zod'

const ParamsSchema = z.object({ id: z.string().min(1).max(80) })

export default defineEventHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const run = await useProviders().groups.get(id)
  if (!run) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diese Gruppe gibt es nicht (mehr).' })
  }
  return redactRun(run, getViewer(event))
})
