import { z } from 'zod'
import { createBlizzardClient } from '../../providers/blizzard/client'

/**
 * Einen einzelnen Blizzard-Endpunkt abrufen und die Antwort zeigen (nur Gildenleitung).
 * Nur öffentliche Pfade mit App-Token – keine Account-Endpunkte (Gold, Position).
 */
const QuerySchema = z.object({
  path: z.string().trim().regex(/^\/(profile\/wow\/character|data\/wow)\/[\w\-/%.]+$/, 'Nur Pfade unter /profile/wow/character/… oder /data/wow/…'),
  namespace: z.enum(['profile', 'dynamic', 'static']).default('profile'),
})

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:tools')
  const { path, namespace } = await getValidatedQuery(event, QuerySchema.parse)
  const { blizzard } = useRuntimeConfig(event)
  const clientId = String(blizzard.clientId ?? '')
  const clientSecret = String(blizzard.clientSecret ?? '')
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'NUXT_BLIZZARD_CLIENT_ID und NUXT_BLIZZARD_CLIENT_SECRET fehlen.' })
  }

  const region = String(blizzard.region || 'eu').toLowerCase()
  const client = createBlizzardClient({ clientId, clientSecret, region })
  const app = await client.getAppToken()
  if (!app.token) throw createError({ statusCode: 502, statusMessage: 'Bad Gateway', message: 'Kein App-Token von Blizzard (Client-ID/Secret prüfen).' })

  const response = await client.get(path, `${namespace}-forever-${region}`, app.token)
  return { url: response.url, status: response.status, body: response.body }
})
