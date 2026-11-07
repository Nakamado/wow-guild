/**
 * Eigene Einstellungen: Zustimmung zur Rangliste und Twitch-Kanal.
 * `isStreamer` kommt aus den aktuellen Discord-Rollen (Rolle „Streamer“).
 */
export default defineEventHandler(async (event) => {
  const viewer = await requirePermission(event, 'characters:manage')
  const store = useMemberSettingsStore()
  const settings = store && viewer.memberId ? await store.get(viewer.memberId) : null
  return {
    /** false im Demo-Modus oder ohne Datenbank – dann lässt sich nichts speichern */
    available: Boolean(store && settings),
    isStreamer: await viewerIsStreamer(event),
    leaderboardOptIn: settings?.leaderboardOptIn ?? false,
    twitchLogin: settings?.twitchLogin ?? null,
  }
})
