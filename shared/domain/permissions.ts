/**
 * Berechtigungen – eine zentrale Funktion für UI (Buttons ein-/ausblenden) und
 * Server (verbindliche Prüfung jeder geschützten Aktion).
 */

/**
 * Besucher · angemeldeter Discord-Nutzer · Gildenmitglied · Admin · Hauptadmin.
 * Admin ist eine Webseitenrolle (vom Hauptadmin vergeben); der Hauptadmin ist fest per
 * serverseitiger Konfiguration hinterlegt und lässt sich über die Oberfläche nicht ändern.
 */
export type AccessLevel = 'visitor' | 'user' | 'member' | 'admin' | 'superadmin'

export interface Viewer {
  level: AccessLevel
  /** Community-Mitglieds-ID, sobald angemeldet */
  memberId: string | null
}

export type Action
  = | 'members:view'
    | 'characters:manage'
    | 'runs:create'
    | 'runs:join'
    | 'runs:edit'
    | 'runs:cancel'
    | 'runs:moderate'
    /** Admin-Werkzeuge (z. B. Blizzard-API-Probe) – nur Gildenleitung */
    | 'admin:tools'
    /** Schwarzes Brett lesen (Mitglieder) bzw. Aushänge verwalten (nur Admins) */
    | 'board:view'
    | 'board:manage'
    /** Adminbereich: Übersicht und Mitgliederliste (Admins und Hauptadmin) */
    | 'admin:area'
    /** Nur Hauptadmin: Admins ernennen/zurückstufen, Protokoll, Ranglistenfreigaben mit Nachweisen */
    | 'roles:manage'
    | 'activity:view'
    | 'leaderboard:grant'

export interface PermissionResource {
  /** Organisator eines Runs */
  organizerId?: string
  /** Besitzer eines Charakters */
  ownerId?: string
}

const rank: Record<AccessLevel, number> = { visitor: 0, user: 1, member: 2, admin: 3, superadmin: 4 }

/** Aktionen, die ausschließlich der Hauptadmin ausführen darf – auch Admins nicht */
const superadminOnly: ReadonlySet<Action> = new Set(['roles:manage', 'activity:view', 'leaderboard:grant'])

export const visitor: Viewer = { level: 'visitor', memberId: null }

export function hasLevel(viewer: Viewer, required: AccessLevel): boolean {
  return rank[viewer.level] >= rank[required]
}

export function can(viewer: Viewer, action: Action, resource: PermissionResource = {}): boolean {
  if (viewer.level === 'superadmin') return true
  if (superadminOnly.has(action)) return false
  if (viewer.level === 'admin') return true

  switch (action) {
    case 'members:view':
    case 'board:view':
    case 'runs:create':
    case 'runs:join':
      return hasLevel(viewer, 'member')
    case 'characters:manage':
      return hasLevel(viewer, 'member') && isSelf(viewer, resource.ownerId)
    case 'runs:edit':
    case 'runs:cancel':
      return hasLevel(viewer, 'member') && isSelf(viewer, resource.organizerId)
    case 'runs:moderate':
    case 'admin:tools':
    case 'board:manage':
    case 'admin:area':
      return false
    default:
      return false
  }
}

function isSelf(viewer: Viewer, id: string | undefined): boolean {
  return viewer.memberId !== null && id !== undefined && viewer.memberId === id
}

/** Kommagetrennte ID-Liste aus der Konfiguration (Leerzeichen und leere Einträge werden ignoriert). */
export function parseIdList(value: string | number | undefined | null): string[] {
  return String(value ?? '').split(',').map(id => id.trim()).filter(Boolean)
}

/** Trägt das Mitglied mindestens eine der (kommagetrennt) konfigurierten Rollen? */
export function hasAnyRole(roleIds: readonly string[], configured: string | undefined | null): boolean {
  return parseIdList(configured).some(id => roleIds.includes(id))
}

/**
 * Leitet die Zugriffsstufe aus den (serverseitig verifizierten) Discord-Rollen ab.
 * Rollen-IDs dürfen kommagetrennt mehrere Rollen enthalten (z. B. Admin und MOD).
 */
export function accessLevelFromRoles(
  roleIds: readonly string[] | null,
  config: { memberRoleId: string, adminRoleId: string },
): AccessLevel {
  if (roleIds === null) return 'user' // angemeldet, aber nicht auf dem Server
  if (hasAnyRole(roleIds, config.adminRoleId)) return 'admin'
  if (hasAnyRole(roleIds, config.memberRoleId)) return 'member'
  return 'user'
}

/**
 * Zugriffsstufe im Live-Betrieb: Discord bestimmt nur noch, wer zur Gilde gehört
 * (Rolle „WoW Forever“) – Admin ist eine Webseitenrolle, Hauptadmin steht in der Konfiguration.
 * - Hauptadmin und Webseiten-Admins brauchen keine Gildenrolle, müssen aber auf dem Discord-Server sein
 *   (roleIds !== null). Ausnahme: der Hauptadmin – er darf sich nie aussperren.
 */
export function accessLevelFor(input: {
  userId: string
  roleIds: readonly string[] | null
  memberRoleId: string
  superadminId: string | null
  /** Webseitenrolle aus der Datenbank (members.is_admin) */
  isSiteAdmin: boolean
}): Exclude<AccessLevel, 'visitor'> {
  if (input.superadminId && input.userId === input.superadminId) return 'superadmin'
  if (input.roleIds === null) return 'user'
  if (input.isSiteAdmin) return 'admin'
  if (hasAnyRole(input.roleIds, input.memberRoleId)) return 'member'
  return 'user'
}
