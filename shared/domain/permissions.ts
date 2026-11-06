/**
 * Berechtigungen – eine zentrale Funktion für UI (Buttons ein-/ausblenden) und
 * Server (verbindliche Prüfung jeder geschützten Aktion).
 */

/** Besucher · angemeldeter Discord-Nutzer · Gildenmitglied · Admin/Event-Moderator */
export type AccessLevel = 'visitor' | 'user' | 'member' | 'admin'

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

export interface PermissionResource {
  /** Organisator eines Runs */
  organizerId?: string
  /** Besitzer eines Charakters */
  ownerId?: string
}

const rank: Record<AccessLevel, number> = { visitor: 0, user: 1, member: 2, admin: 3 }

export const visitor: Viewer = { level: 'visitor', memberId: null }

export function hasLevel(viewer: Viewer, required: AccessLevel): boolean {
  return rank[viewer.level] >= rank[required]
}

export function can(viewer: Viewer, action: Action, resource: PermissionResource = {}): boolean {
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
