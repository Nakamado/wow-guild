import type { H3Event } from 'h3'
import {
  DEFAULT_DEMO_PERSONA,
  DEMO_LIVE_COOKIE,
  DEMO_PERSONA_COOKIE,
  demoPersonas,
  isDemoPersonaId,
  type DemoPersonaId,
} from '../../data/demo/personas'
import { can, visitor, type Action, type PermissionResource, type Viewer } from '#shared/domain/permissions'

export interface ResolvedViewer extends Viewer {
  /** Nur im Demo-Modus gesetzt */
  persona: DemoPersonaId | null
}

/**
 * Wer stellt die Anfrage?
 * - Demo-Modus: Persona aus dem Demo-Cookie (sichtbar markierte Rollenauswahl).
 * - Live: Discord-Session (Phase 6). Bis dahin ist jeder Besucher.
 */
export function getViewer(event: H3Event): ResolvedViewer {
  if (!useRuntimeConfig(event).public.demoMode) return { ...visitor, persona: null }

  const cookie = getCookie(event, DEMO_PERSONA_COOKIE)
  const persona = isDemoPersonaId(cookie) ? cookie : DEFAULT_DEMO_PERSONA
  const { level, memberId } = demoPersonas[persona]
  return { level, memberId, persona }
}

export function isDemoLiveSimulated(event: H3Event): boolean {
  return Boolean(useRuntimeConfig(event).public.demoMode) && getCookie(event, DEMO_LIVE_COOKIE) === '1'
}

/** Bricht mit 401/403 ab, wenn die Aktion nicht erlaubt ist – verbindliche serverseitige Prüfung. */
export function requirePermission(event: H3Event, action: Action, resource?: PermissionResource): ResolvedViewer {
  const viewer = getViewer(event)
  if (can(viewer, action, resource)) return viewer

  const signedIn = viewer.level !== 'visitor'
  throw createError({
    statusCode: signedIn ? 403 : 401,
    statusMessage: signedIn ? 'Forbidden' : 'Unauthorized',
    message: signedIn
      ? 'Diese Funktion ist Gildenmitgliedern vorbehalten.'
      : 'Bitte melde dich mit Discord an, um diesen Bereich zu sehen.',
  })
}
