import type { RoleId } from '../types'

export interface RoleDefinition {
  id: RoleId
  name: string
  /** Kurzform für Badges und Besetzungsanzeigen */
  short: string
}

/** Reihenfolge = Darstellung (Tank → Heiler → DD) */
export const roles: readonly RoleDefinition[] = [
  { id: 'tank', name: 'Tank', short: 'Tank' },
  { id: 'healer', name: 'Heiler', short: 'Heiler' },
  { id: 'dps', name: 'Schadensverursacher', short: 'DD' },
]

export const roleIds: readonly RoleId[] = roles.map(role => role.id)

export function getRole(id: RoleId): RoleDefinition {
  // roles deckt alle RoleIds ab, daher ist das Ergebnis immer definiert
  return roles.find(role => role.id === id)!
}
