import { z } from 'zod'
import type { H3Event } from 'h3'

const ParamsSchema = z.object({ id: z.string().min(1).max(64) })

/** Eigenen Charakter aus der URL laden – fremde Charaktere gelten als „nicht gefunden“. */
export async function loadOwnCharacter(event: H3Event, memberId: string) {
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const character = await useProviders().characters.get(id)
  if (!character || character.memberId !== memberId) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diesen Charakter gibt es nicht (mehr).' })
  }
  return character
}
