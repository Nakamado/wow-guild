import { z } from 'zod'

const ParamsSchema = z.object({ id: z.uuid() })

/** Adminfreigabe zurückziehen (nur Hauptadmin); der Nachweis wird dabei gelöscht */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await requirePermission(event, 'leaderboard:grant')
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const grants = requireStore(useGrantStore())
  const grant = await persist(() => grants.get(id))
  if (!grant) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diese Freigabe gibt es nicht (mehr).' })
  if (!grant.revokedAt) {
    await persist(() => grants.revoke(id, 'admin'))
    await logActivity({ action: 'leaderboard.revoked', actorId: viewer.memberId, subjectType: 'leaderboard', subjectId: grant.characterId, summary: 'Adminfreigabe zurückgezogen' })
  }
  setResponseStatus(event, 204)
  return null
})
