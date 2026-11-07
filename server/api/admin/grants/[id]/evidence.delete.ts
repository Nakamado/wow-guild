import { z } from 'zod'

const ParamsSchema = z.object({ id: z.uuid() })

/** Nur den Nachweis löschen, die Freigabe bleibt bestehen (nur Hauptadmin) */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await requirePermission(event, 'leaderboard:grant')
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const grants = requireStore(useGrantStore())
  const grant = await persist(() => grants.get(id))
  if (!grant) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diese Freigabe gibt es nicht (mehr).' })
  if (grant.evidencePath) {
    await persist(() => grants.deleteEvidence(id))
    await logActivity({ action: 'leaderboard.evidence-deleted', actorId: viewer.memberId, subjectType: 'leaderboard', subjectId: grant.characterId, summary: 'Screenshot-Nachweis gelöscht' })
  }
  setResponseStatus(event, 204)
  return null
})
