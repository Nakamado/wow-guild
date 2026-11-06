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
import { accessLevelFromRoles, can, parseIdList, visitor, type Action, type PermissionResource, type Viewer } from '#shared/domain/permissions'
import { createDiscordBotClient, fetchOwnGuildMember } from '../providers/discord'

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

  let { roles, rolesCheckedAt } = session.secure
  const age = Date.now() - rolesCheckedAt
  if (age > ROLE_RECHECK_MS) {
    const fresh = await recheckRoles(event, session.user.id, session.secure)
    if (fresh !== undefined) {
      roles = fresh
      rolesCheckedAt = Date.now()
      await replaceUserSession(event, { ...session, secure: { ...session.secure, roles, rolesCheckedAt } })
      const level = accessLevelFor(event, session.user.id, roles)
      await rememberMember({ ...session.user, isGuildMember: level !== 'user', isAdmin: level === 'admin', login: false })
    }
    else if (age > ROLE_MAX_AGE_MS) {
      roles = null // veraltet und nicht prüfbar → nur noch „angemeldet“
    }
  }

  const level = accessLevelFor(event, session.user.id, roles)
  return { level, memberId: session.user.id, persona: null, user: session.user }
}

/**
 * Zugriffsstufe eines angemeldeten Discord-Nutzers. Betreiber der Seite
 * (NUXT_ADMIN_USER_IDS) sind immer Admin – auch ohne Discord-Rolle.
 */
export function accessLevelFor(event: H3Event, userId: string, roles: string[] | null): Exclude<Viewer['level'], 'visitor'> {
  const config = useRuntimeConfig(event)
  if (parseIdList(config.adminUserIds).includes(userId)) return 'admin'
  const roleConfig = { memberRoleId: String(config.discord.memberRoleId ?? ''), adminRoleId: String(config.discord.adminRoleId ?? '') }
  return accessLevelFromRoles(roles, roleConfig) as Exclude<Viewer['level'], 'visitor'>
}

/**
 * Rollen erneut bei Discord abfragen: per Bot, sonst mit dem Token des Nutzers.
 * undefined = Prüfung nicht möglich (kein Bot/Token, Discord nicht erreichbar).
 */
async function recheckRoles(
  event: H3Event,
  userId: string,
  secure: { accessToken?: string, accessTokenExpiresAt?: number },
): Promise<string[] | null | undefined> {
  const { botToken, guildId } = useRuntimeConfig(event).discord
  if (!guildId) return undefined
  try {
    if (botToken) {
      const member = await createDiscordBotClient(botToken).getGuildMember(guildId, userId)
      return member ? member.roles : null
    }
    if (secure.accessToken && (secure.accessTokenExpiresAt ?? 0) > Date.now()) {
      const member = await fetchOwnGuildMember(secure.accessToken, guildId)
      return member ? member.roles : null
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
