import { safeReturnPath } from '#shared/utils/return-path'

/**
 * Battle.net-Verknüpfung (vorerst nur für die API-Probe der Gildenleitung).
 * Discord bleibt das Login; Battle.net wird zusätzlich verbunden (Scope `wow.profile`).
 * Das Token liegt nur im verschlüsselten Session-Cookie und läuft nach Blizzard-Vorgabe ab.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (config.public.demoMode) return sendRedirect(event, '/')

  const viewer = await getViewer(event)
  assertPermission(viewer, 'admin:tools')

  const handler = defineOAuthBattledotnetEventHandler({
    config: {
      clientId: String(config.blizzard.clientId ?? ''),
      clientSecret: String(config.blizzard.clientSecret ?? ''),
      scope: ['wow.profile'],
      region: String(config.blizzard.region || 'eu').toUpperCase(),
      redirectURL: `${config.public.siteUrl.replace(/\/$/, '')}/auth/battlenet`,
    },
    // Typen von nuxt-auth-utils zielen auf h3 v2; zur Laufzeit ist es dasselbe Event wie oben
    async onSuccess(_, { user, tokens }) {
      const session = await getUserSession(event)
      if (session.user && session.secure) {
        await replaceUserSession(event, {
          ...session,
          secure: {
            ...session.secure,
            battlenet: {
              accessToken: tokens.access_token,
              expiresAt: Date.now() + Number(tokens.expires_in ?? 0) * 1000,
              battletag: typeof user?.battletag === 'string' ? user.battletag : null,
            },
          },
        })
      }
      return sendRedirect(event, safeReturnPath('/admin/blizzard'))
    },
    onError(_, error) {
      console.warn(`[auth] Battle.net-Verknüpfung fehlgeschlagen (${error.statusCode ?? 'unbekannt'})`)
      return sendRedirect(event, '/admin/blizzard?battlenet=fehlgeschlagen')
    },
  })

  return handler(event as unknown as Parameters<typeof handler>[0])
})
