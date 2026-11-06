import { z } from 'zod'

const ParamsSchema = z.object({ id: z.uuid() })

/** Aushang bearbeiten (nur Admins) */
export default defineEventHandler(async (event) => {
  const { store, input } = await beginBoardWrite(event, { withBody: true })
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  return persist(() => store.update(id, input!))
})
