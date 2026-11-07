import { MemberSettingsPatchSchema, normalizeTwitchLogin, TwitchLoginSchema } from '#shared/schemas/member-settings'

/** Eigene Einstellungen ändern (Rangliste ein/aus, Twitch-Kanal). */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await requirePermission(event, 'characters:manage')
  const store = useMemberSettingsStore()
  if (!store || !viewer.memberId) {
    throw createError({ statusCode: 409, statusMessage: 'Conflict', message: 'Einstellungen lassen sich gerade nicht speichern.' })
  }
  const body = await readValidatedBody(event, MemberSettingsPatchSchema.parse)

  let twitchLogin: string | null | undefined
  if (body.twitchLogin !== undefined) {
    const normalized = normalizeTwitchLogin(body.twitchLogin)
    if (normalized !== null) {
      const parsed = TwitchLoginSchema.safeParse(normalized)
      if (!parsed.success) {
        throw createError({ statusCode: 422, statusMessage: 'Unprocessable Entity', message: parsed.error.issues[0]?.message ?? 'Ungültiger Twitch-Kanal.' })
      }
      twitchLogin = parsed.data
    }
    else {
      twitchLogin = null
    }
  }

  const settings = await persist(() => store.update(viewer.memberId!, { leaderboardOptIn: body.leaderboardOptIn, twitchLogin }))
  return { available: true, isStreamer: await viewerIsStreamer(event), ...settings }
})
