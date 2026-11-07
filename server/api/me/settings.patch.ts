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

  const memberId = viewer.memberId
  const before = await store.get(memberId)
  const settings = await persist(() => store.update(memberId, { leaderboardOptIn: body.leaderboardOptIn, twitchLogin }))

  // Widerruf hat Vorrang: beendet auch alle Adminfreigaben (eine neue braucht eine neue Zustimmung)
  let revokedGrants = 0
  if (body.leaderboardOptIn === false) {
    revokedGrants = (await persist(async () => (await useGrantStore()?.revokeAllForMember(memberId)) ?? [])).length
  }
  if (body.leaderboardOptIn !== undefined && (body.leaderboardOptIn !== before?.leaderboardOptIn || revokedGrants)) {
    await logActivity(body.leaderboardOptIn
      ? { action: 'leaderboard.opted-in', actorId: memberId, subjectType: 'leaderboard', subjectId: memberId, summary: 'Teilnahme an der Rangliste selbst aktiviert' }
      : { action: 'leaderboard.opted-out', actorId: memberId, subjectType: 'leaderboard', subjectId: memberId, summary: revokedGrants ? `Teilnahme widerrufen (inkl. ${revokedGrants} Adminfreigabe${revokedGrants === 1 ? '' : 'n'})` : 'Teilnahme an der Rangliste widerrufen' })
  }
  const grantedCharacterIds = (await useGrantStore()?.listActive().catch(() => []) ?? [])
    .filter(grant => grant.memberId === memberId).map(grant => grant.characterId)
  return { available: true, isStreamer: await viewerIsStreamer(event), grantedCharacterIds, ...settings }
})
