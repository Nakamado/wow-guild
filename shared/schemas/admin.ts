import { z } from 'zod'

/** Wie wurde die Zustimmung zur öffentlichen Rangliste erteilt? */
export const ConsentChannelSchema = z.enum(['discord-message', 'discord-voice', 'in-game', 'in-person', 'other'])
export type ConsentChannel = z.infer<typeof ConsentChannelSchema>

export const consentChannelLabels: Record<ConsentChannel, string> = {
  'discord-message': 'Discord-Nachricht',
  'discord-voice': 'Discord-Sprachchat',
  'in-game': 'Im Spiel',
  'in-person': 'Persönlich',
  'other': 'Anders',
}

/** Adminfreigabe für einen Charakter (Felder aus dem Formular; der Screenshot kommt separat) */
export const LeaderboardGrantInputSchema = z.object({
  memberId: z.string().regex(/^\d{5,25}$/),
  characterId: z.uuid(),
  consentChannel: ConsentChannelSchema,
  consentDate: z.iso.date(),
  note: z.string().trim().max(300).optional().transform(value => value || null),
  /** ausdrückliche Bestätigung, dass eine Zustimmung zur öffentlichen Rangliste vorliegt */
  confirmed: z.literal(true, { message: 'Bitte bestätige, dass eine ausdrückliche Zustimmung zur öffentlichen Rangliste vorliegt.' }),
})
export type LeaderboardGrantInput = z.infer<typeof LeaderboardGrantInputSchema>

export const RoleChangeSchema = z.object({ role: z.enum(['admin', 'member']) })

export interface LeaderboardGrant {
  id: string
  memberId: string
  characterId: string
  consentChannel: ConsentChannel
  consentDate: string
  note: string | null
  hasEvidence: boolean
  grantedBy: string
  createdAt: string
  revokedAt: string | null
  revokedReason: 'member' | 'admin' | null
}

export interface ActivityEntry {
  id: number
  occurredAt: string
  action: string
  actorId: string | null
  subjectType: 'member' | 'character' | 'leaderboard'
  subjectId: string | null
  summary: string
}
