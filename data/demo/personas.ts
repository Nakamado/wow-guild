import type { AccessLevel } from '../../shared/domain/permissions'

/**
 * Demo-Rollenauswahl statt echtem Login. Jede Persona entspricht einem fiktiven Demo-Mitglied,
 * damit Berechtigungen (z. B. „eigene Runs bearbeiten“) realistisch ausprobiert werden können.
 */
export const demoPersonas = {
  visitor: { label: 'Besucher', level: 'visitor', memberId: null },
  member: { label: 'Mitglied', level: 'member', memberId: 'demo-member-04' },
  organizer: { label: 'Organisator', level: 'member', memberId: 'demo-member-02' },
  admin: { label: 'Admin', level: 'admin', memberId: 'demo-member-01' },
  superadmin: { label: 'Hauptadmin', level: 'superadmin', memberId: 'demo-member-01' },
  // Gildenmitglied ohne eingetragene Charaktere – zeigt das Charakter-Onboarding
  newcomer: { label: 'Neues Mitglied', level: 'member', memberId: 'demo-member-11' },
} as const satisfies Record<string, { label: string, level: AccessLevel, memberId: string | null }>

export type DemoPersonaId = keyof typeof demoPersonas

export const DEFAULT_DEMO_PERSONA: DemoPersonaId = 'member'

export const DEMO_PERSONA_COOKIE = 'wow-guild-demo-persona'
export const DEMO_LIVE_COOKIE = 'wow-guild-demo-live'

export function isDemoPersonaId(value: unknown): value is DemoPersonaId {
  return typeof value === 'string' && value in demoPersonas
}
