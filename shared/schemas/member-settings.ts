import { z } from 'zod'

/** Twitch-Benutzername wie in der Kanal-URL (twitch.tv/<name>) – wird klein gespeichert */
export const TwitchLoginSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,25}$/, 'Bitte nur den Kanalnamen eintragen (3–25 Zeichen: Buchstaben, Ziffern, _).')

export const MemberSettingsSchema = z.object({
  /** In der öffentlichen Rangliste erscheinen (Opt-in, jederzeit widerrufbar) */
  leaderboardOptIn: z.boolean(),
  /** Eigener Twitch-Kanal – wird nur mit Discord-Rolle „Streamer“ auf der Seite gezeigt */
  twitchLogin: TwitchLoginSchema.nullable(),
})

export const MemberSettingsPatchSchema = z.object({
  leaderboardOptIn: z.boolean().optional(),
  /** Twitch-Link oder Kanalname; leer = entfernen */
  twitchLogin: z.string().max(100).nullable().optional(),
})

export type MemberSettings = z.infer<typeof MemberSettingsSchema>
export type MemberSettingsPatch = z.infer<typeof MemberSettingsPatchSchema>

/** „https://www.twitch.tv/Name“, „twitch.tv/name“ oder „@name“ → „name“; null = leer */
export function normalizeTwitchLogin(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim()
  if (!raw) return null
  const fromUrl = raw.match(/^(?:https?:\/\/)?(?:www\.|m\.)?twitch\.tv\/([^/?#\s]+)/i)?.[1]
  return (fromUrl ?? raw).replace(/^@/, '').toLowerCase()
}
