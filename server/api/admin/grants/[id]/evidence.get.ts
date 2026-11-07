import { z } from 'zod'

const ParamsSchema = z.object({ id: z.uuid() })

/**
 * Zustimmungsnachweis anzeigen – ausschließlich für den Hauptadmin. Die Datei kommt über den
 * Server aus dem privaten Bucket (keine öffentliche oder dauerhafte URL) und wird nicht zwischengespeichert.
 */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'leaderboard:grant')
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const grants = requireStore(useGrantStore())
  const grant = await persist(() => grants.get(id))
  if (!grant?.evidencePath) throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Kein Nachweis vorhanden.' })
  const file = await persist(() => grants.readEvidence(grant.evidencePath!))
  const type = grant.evidencePath.endsWith('.png') ? 'image/png' : grant.evidencePath.endsWith('.webp') ? 'image/webp' : 'image/jpeg'
  setResponseHeaders(event, {
    'Content-Type': type,
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': 'inline',
  })
  return new Uint8Array(await file.arrayBuffer())
})
