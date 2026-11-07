/**
 * Eigene Einstellungen: Zustimmung zur Rangliste und Twitch-Kanal.
 * `isStreamer` kommt aus den aktuellen Discord-Rollen (Rolle „Streamer“).
 */
export default defineEventHandler(async (event) => {
  const viewer = await requirePermission(event, 'characters:manage')
  const store = useMemberSettingsStore()
  const settings = store && viewer.memberId ? await store.get(viewer.memberId) : null
  const grants = settings && viewer.memberId
    ? (await useGrantStore()?.listActive().catch(() => []) ?? []).filter(grant => grant.memberId === viewer.memberId)
    : []
  return {
    /** false im Demo-Modus oder ohne Datenbank – dann lässt sich nichts speichern */
    available: Boolean(store && settings),
    isStreamer: await viewerIsStreamer(event),
    leaderboardOptIn: settings?.leaderboardOptIn ?? false,
    /** Charaktere, die der Hauptadmin mit deiner Zustimmung freigegeben hat */
    grantedCharacterIds: grants.map(grant => grant.characterId),
    twitchLogin: settings?.twitchLogin ?? null,
  }
})
