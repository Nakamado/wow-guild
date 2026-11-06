import { z } from 'zod'

const ParamsSchema = z.object({ id: z.uuid() })

/** Aushang entfernen (nur Admins) */
export default defineEventHandler(async (event) => {
  const { store } = await beginBoardWrite(event, { withBody: false })
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  await persist(() => store.remove(id))
  setResponseStatus(event, 204)
  return null
})
