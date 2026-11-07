import { discordAvatarUrl, discordDisplayName } from '../../providers/discord/normalize'
import { DiscordUserSchema } from '../../providers/discord/schemas'
import { fetchOwnGuildMember } from '../../providers/discord'

import { safeReturnPath } from '#shared/utils/return-path'

const RETURN_COOKIE = 'wow-guild-return-to'

/**
 * Discord-Login (OAuth2, Scopes `identify` + `guilds.members.read`).
 * Danach werden die Rollen auf dem Gilden-Server abgefragt und – nur serverseitig lesbar –
 * in der versiegelten Session gespeichert. Das Discord-Token selbst wird nicht gespeichert.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event)
  if (config.public.demoMode) return sendRedirect(event, '/')

  const query = getQuery(event)
  // Erster Aufruf (ohne `code`): Rücksprungziel merken
  if (!query.code && !query.error) {
    setCookie(event, RETURN_COOKIE, safeReturnPath(query.returnTo), { httpOnly: true, sameSite: 'lax', maxAge: 600, path: '/' })
  }

  const handler = defineOAuthDiscordEventHandler({
    config: {
      clientId: config.discord.clientId,
      clientSecret: config.discord.clientSecret,
      scope: ['identify', 'guilds.members.read'],
      redirectURL: `${config.public.siteUrl.replace(/\/$/, '')}/auth/discord`,
    },
    // Typen von nuxt-auth-utils zielen auf h3 v2; zur Laufzeit ist es dasselbe Event wie oben
    async onSuccess(_, { user, tokens }) {
      const discordUser = DiscordUserSchema.parse(user)
      const member = await fetchOwnGuildMember(tokens.access_token, config.discord.guildId)

      const profile = {
        id: discordUser.id,
        displayName: discordDisplayName(discordUser, member?.nick),
        avatarUrl: discordAvatarUrl(discordUser, config.discord.guildId, member?.avatar),
      }
      const roles = member?.roles ?? null
      await replaceUserSession(event, {
        user: profile,
        secure: {
          roles,
          rolesCheckedAt: Date.now(),
          // Für die Rollen-Nachprüfung ohne Bot (nur im verschlüsselten Cookie)
          accessToken: tokens.access_token,
          accessTokenExpiresAt: Date.now() + Number(tokens.expires_in ?? 0) * 1000,
        },
        loggedInAt: new Date().toISOString(),
      })

      // Profil anlegen bzw. aktualisieren – das erste Mal wird als Registrierung protokolliert
      const isNew = (await siteAccount(profile.id)) === null
      const level = await accessLevelFor(event, profile.id, roles)
      await rememberMember({ ...profile, isGuildMember: level !== 'user', isStreamer: hasStreamerRole(event, roles), login: true })
      forgetSiteAccount(profile.id)
      if (isNew) {
        await logActivity({ action: 'account.registered', actorId: profile.id, subjectType: 'member', subjectId: profile.id, summary: 'Konto über den Discord-Login angelegt' })
      }

      const returnTo = safeReturnPath(getCookie(event, RETURN_COOKIE))
      deleteCookie(event, RETURN_COOKIE, { path: '/' })
      return sendRedirect(event, returnTo)
    },
    onError(_, error) {
      // Abbruch durch Nutzer oder abgelaufener State – keine Details ins Log (Datenschutz)
      console.warn(`[auth] Discord-Login fehlgeschlagen (${error.statusCode ?? 'unbekannt'})`)
      return sendRedirect(event, '/?login=fehlgeschlagen')
    },
  })

  return handler(event as unknown as Parameters<typeof handler>[0])
})
