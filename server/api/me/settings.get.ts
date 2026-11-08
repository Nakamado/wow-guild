/**
 * Eigene Einstellungen: Zustimmung zur Rangliste und Twitch-Kanal.
 * `isStreamer` kommt aus den aktuellen Discord-Rollen (Rolle „Streamer“).
 */
export default defineEventHandler(async (event) => {
  // eigene Einstellungen: Ressource ist das eigene Konto (ohne ownerId würde die Prüfung für Mitglieder scheitern)
  const viewer = await getViewer(event)
  assertPermission(viewer, 'characters:manage', { ownerId: viewer.memberId ?? undefined })
  const store = useMemberSettingsStore()
  const settings = store && viewer.memberId
    ? await store.get(viewer.memberId).catch((error) => {
        // im Vercel-Log sichtbar machen – sonst bleibt das Häkchen auf der Seite nur still gesperrt
        console.warn(`[settings] Einstellungen von ${viewer.memberId} nicht lesbar: ${error instanceof Error ? error.message : 'unbekannt'}`)
        throw createError({ statusCode: 503, statusMessage: 'Service Unavailable', message: 'Deine Einstellungen konnten gerade nicht geladen werden. Bitte versuche es gleich noch einmal.' })
      })
    : null
  if (store && viewer.memberId && !settings) console.warn(`[settings] Kein Mitgliedseintrag für ${viewer.memberId} – Speichern nicht möglich`)
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
