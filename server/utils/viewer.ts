import type { H3Event } from 'h3'
import type { User } from '#auth-utils'
import {
  DEFAULT_DEMO_PERSONA,
  DEMO_LIVE_COOKIE,
  DEMO_PERSONA_COOKIE,
  demoPersonas,
  isDemoPersonaId,
  type DemoPersonaId,
} from '../../data/demo/personas'
import { accessLevelFor as accessLevelForSite, accessLevelFromRoles, can, visitor, type Action, type PermissionResource, type Viewer } from '#shared/domain/permissions'
import { createDiscordBotClient, fetchOwnGuildMember } from '../providers/discord'
import { discordAvatarUrl, discordDisplayName } from '../providers/discord/normalize'
import type { DiscordGuildMember } from '../providers/discord/schemas'

export interface ResolvedViewer extends Viewer {
  /** Nur im Demo-Modus gesetzt */
  persona: DemoPersonaId | null
  /** Angemeldeter Discord-Nutzer (nur live) */
  user: User | null
}

/** Rollen werden nach dieser Zeit beim Discord-Bot neu geprüft. */
export const ROLE_RECHECK_MS = 10 * 60_000
/** Ohne erfolgreiche Prüfung gelten Rollen höchstens so lange (z. B. wenn der Bot fehlt). */
export const ROLE_MAX_AGE_MS = 12 * 60 * 60_000

let warnedSession = false

/**
 * Eine Seite löst viele API-Anfragen gleichzeitig aus. Ohne Bündelung prüft jede davon die Rollen
 * bei Discord – das endet in „429 Too Many Requests“. Daher: eine laufende Prüfung pro Nutzer teilen
 * und nach einem Fehler kurz pausieren (die Rollen aus der Session gelten so lange weiter).
 */
const ROLE_RECHECK_BACKOFF_MS = 2 * 60_000
const recheckInFlight = new Map<string, Promise<Awaited<ReturnType<typeof recheckRoles>>>>()
const recheckPausedUntil = new Map<string, number>()

function recheckRolesOnce(event: H3Event, userId: string, secure: Parameters<typeof recheckRoles>[2]) {
  if ((recheckPausedUntil.get(userId) ?? 0) > Date.now()) return Promise.resolve(undefined)
  const running = recheckInFlight.get(userId)
  if (running) return running
  const pending = recheckRoles(event, userId, secure)
    .then((result) => {
      if (result === undefined) recheckPausedUntil.set(userId, Date.now() + ROLE_RECHECK_BACKOFF_MS)
      else recheckPausedUntil.delete(userId)
      return result
    })
    .finally(() => recheckInFlight.delete(userId))
  recheckInFlight.set(userId, pending)
  return pending
}

/**
 * Wer stellt die Anfrage?
 * - Demo-Modus: Persona aus dem Demo-Cookie (sichtbar markierte Rollenauswahl).
 * - Live: Discord-Session. Rollen älter als 10 Minuten werden per Bot nachgeprüft;
 *   wer die Gildenrolle verliert, verliert damit sofort die Mitgliedsrechte.
 */
export async function getViewer(event: H3Event): Promise<ResolvedViewer> {
  const cached = event.context.viewer as ResolvedViewer | undefined
  if (cached) return cached

  const viewer = await resolveViewer(event)
  event.context.viewer = viewer
  return viewer
}

async function resolveViewer(event: H3Event): Promise<ResolvedViewer> {
  const config = useRuntimeConfig(event)
  if (config.public.demoMode) {
    const cookie = getCookie(event, DEMO_PERSONA_COOKIE)
    const persona = isDemoPersonaId(cookie) ? cookie : DEFAULT_DEMO_PERSONA
    const { level, memberId } = demoPersonas[persona]
    return { level, memberId, persona, user: null }
  }

  let session
  try {
    session = await getUserSession(event)
  }
  catch (error) {
    // Meist fehlt NUXT_APP_SECRET – dann ist niemand angemeldet
    if (!warnedSession) console.warn(`[auth] Session nicht lesbar – ist NUXT_APP_SECRET gesetzt? (${error instanceof Error ? error.message : 'unbekannt'})`)
    warnedSession = true
    return { ...visitor, persona: null, user: null }
  }
  if (!session.user || !session.secure) return { ...visitor, persona: null, user: null }
  let currentUser = session.user

  let { roles, rolesCheckedAt } = session.secure
  const age = Date.now() - rolesCheckedAt
  if (age > ROLE_RECHECK_MS) {
    const fresh = await recheckRolesOnce(event, session.user.id, session.secure)
    if (fresh !== undefined) {
      roles = fresh?.roles ?? null
      rolesCheckedAt = Date.now()
      // Name und Profilbild aus Discord mitziehen – Änderungen erscheinen so spätestens nach ~10 Minuten
      const { guildId } = useRuntimeConfig(event).discord
      const user = fresh?.member.user
        ? {
            ...currentUser,
            displayName: discordDisplayName(fresh.member.user, fresh.member.nick),
            avatarUrl: discordAvatarUrl(fresh.member.user, guildId, fresh.member.avatar),
          }
        : currentUser
      await replaceUserSession(event, { ...session, user, secure: { ...session.secure, roles, rolesCheckedAt } })
      currentUser = user
      const level = await accessLevelFor(event, user.id, roles)
      await rememberMember({ ...user, isGuildMember: level !== 'user', isStreamer: hasStreamerRole(event, roles), login: false })
    }
    else if (age > ROLE_MAX_AGE_MS) {
      roles = null // veraltet und nicht prüfbar → nur noch „angemeldet“
    }
  }

  // Konto gelöscht (z. B. auf einem anderen Gerät)? Dann gilt auch diese Sitzung nicht mehr.
  if (await siteAccount(currentUser.id) === null) {
    await clearUserSession(event).catch(() => {})
    return { ...visitor, persona: null, user: null }
  }

  const level = await accessLevelFor(event, currentUser.id, roles)
  return { level, memberId: currentUser.id, persona: null, user: currentUser }
}

/**
 * Zugriffsstufe eines angemeldeten Discord-Nutzers:
 * - Hauptadmin: fest aus der Konfiguration (NUXT_SUPERADMIN_USER_ID)
 * - Admin: Webseitenrolle aus der Datenbank (nur der Hauptadmin vergibt sie)
 * - Mitglied: Discord-Rolle „WoW Forever“
 * Ohne Datenbank (z. B. lokal) gilt übergangsweise die Discord-Adminrolle.
 */
export async function accessLevelFor(event: H3Event, userId: string, roles: string[] | null): Promise<Exclude<Viewer['level'], 'visitor'>> {
  const config = useRuntimeConfig(event)
  const memberRoleId = String(config.discord.memberRoleId ?? '')
  const account = await siteAccount(userId)
  if (account === undefined && superadminId(event) !== userId) {
    return accessLevelFromRoles(roles, { memberRoleId, adminRoleId: String(config.discord.adminRoleId ?? '') }) as Exclude<Viewer['level'], 'visitor'>
  }
  return accessLevelForSite({ userId, roleIds: roles, memberRoleId, superadminId: superadminId(event), isSiteAdmin: account?.isAdmin ?? false })
}

/** Trägt der Nutzer die Discord-Rolle „Streamer“? undefined = Rollen unbekannt oder Rolle nicht eingerichtet */
export function hasStreamerRole(event: H3Event, roles: string[] | null): boolean | undefined {
  const roleId = String(useRuntimeConfig(event).discord.streamerRoleId ?? '').trim()
  if (!roleId || !roles) return undefined
  return roles.includes(roleId)
}

/** Hat der aktuelle Betrachter die Streamer-Rolle? (Rollen aus der versiegelten Session) */
export async function viewerIsStreamer(event: H3Event): Promise<boolean> {
  if (useRuntimeConfig(event).public.demoMode) return false
  const session = await getUserSession(event).catch(() => null)
  return hasStreamerRole(event, session?.secure?.roles ?? null) ?? false
}

/**
 * Rollen erneut bei Discord abfragen: per Bot, sonst mit dem Token des Nutzers.
 * undefined = Prüfung nicht möglich (kein Bot/Token, Discord nicht erreichbar).
 */
async function recheckRoles(
  event: H3Event,
  userId: string,
  secure: { accessToken?: string, accessTokenExpiresAt?: number },
): Promise<{ roles: string[], member: DiscordGuildMember } | null | undefined> {
  const { botToken, guildId } = useRuntimeConfig(event).discord
  if (!guildId) return undefined
  try {
    if (botToken) {
      const member = await createDiscordBotClient(botToken).getGuildMember(guildId, userId)
      return member ? { roles: member.roles, member } : null
    }
    if (secure.accessToken && (secure.accessTokenExpiresAt ?? 0) > Date.now()) {
      const member = await fetchOwnGuildMember(secure.accessToken, guildId)
      return member ? { roles: member.roles, member } : null
    }
    return undefined
  }
  catch (error) {
    console.warn(`[auth] Rollenprüfung fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannt'}`)
    return undefined
  }
}

export function isDemoLiveSimulated(event: H3Event): boolean {
  return Boolean(useRuntimeConfig(event).public.demoMode) && getCookie(event, DEMO_LIVE_COOKIE) === '1'
}

/** Bricht mit 401/403 ab, wenn die Aktion nicht erlaubt ist – verbindliche serverseitige Prüfung. */
export async function requirePermission(event: H3Event, action: Action, resource?: PermissionResource): Promise<ResolvedViewer> {
  const viewer = await getViewer(event)
  assertPermission(viewer, action, resource)
  return viewer
}

export function assertPermission(viewer: Viewer, action: Action, resource?: PermissionResource) {
  if (can(viewer, action, resource)) return

  const signedIn = viewer.level !== 'visitor'
  throw createError({
    statusCode: signedIn ? 403 : 401,
    statusMessage: signedIn ? 'Forbidden' : 'Unauthorized',
    message: signedIn
      ? 'Diese Funktion ist Gildenmitgliedern vorbehalten.'
      : 'Bitte melde dich mit Discord an, um diesen Bereich zu sehen.',
  })
}
