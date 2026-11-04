/**
 * Weitere Gilden-Streamer (Live-Betrieb). Twitch-Daten wie Anzeigename, Avatar und
 * Livestatus werden automatisch über die Twitch-API geladen.
 *
 * - `login`: Twitch-Benutzername (klein geschrieben, wie in der Kanal-URL)
 * - `discordId`: optional – verknüpft den Streamer mit einem Gildenmitglied.
 *   Nur explizit eintragen, nie aus Namensähnlichkeit ableiten.
 *
 * Miinyu selbst steht hier nicht drin (eigener Bereich auf der Startseite).
 */
export interface StreamerEntry {
  login: string
  discordId?: string
}

export const guildStreamers: StreamerEntry[] = [
  // { login: 'beispielkanal', discordId: '123456789012345678' },
]
