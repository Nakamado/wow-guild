import { createBlizzardClient } from '../../providers/blizzard/client'
import { runBlizzardProbe } from '../../providers/blizzard/probe'

/** Blizzard-API-Probe (nur Gildenleitung). Speichert nichts, gibt nur Status und Feldnamen zurück. */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'admin:tools')
  const { blizzard } = useRuntimeConfig(event)
  const clientId = String(blizzard.clientId ?? '')
  const clientSecret = String(blizzard.clientSecret ?? '')
  if (!clientId || !clientSecret) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'NUXT_BLIZZARD_CLIENT_ID und NUXT_BLIZZARD_CLIENT_SECRET fehlen.' })
  }

  const session = await getUserSession(event)
  const battlenet = session.secure?.battlenet
  const userToken = battlenet && battlenet.expiresAt > Date.now() ? battlenet.accessToken : null

  const region = String(blizzard.region || 'eu').toLowerCase()
  const report = await runBlizzardProbe(createBlizzardClient({ clientId, clientSecret, region }), {
    region,
    guildSlug: String(blizzard.guildSlug ?? ''),
    userToken,
  })
  return { ...report, battlenet: battlenet ? { battletag: battlenet.battletag, expiresAt: new Date(battlenet.expiresAt).toISOString(), valid: Boolean(userToken) } : null }
})
