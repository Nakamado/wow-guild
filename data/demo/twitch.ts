import type { Clip, StreamStatus, Streamer } from '../../shared/types'

/**
 * EINDEUTIG FIKTIVE Twitch-Daten. Clip-Titel sind Platzhalter, keine echten Clips;
 * Thumbnails fehlen bewusst (UI zeigt gekennzeichnete Platzhalter).
 */
export function createDemoClips(now: Date, broadcasterName: string): Clip[] {
  const clip = (index: number, title: string, daysAgo: number, viewCount: number, creatorName: string): Clip => ({
    id: `demo-clip-${String(index).padStart(2, '0')}`,
    title,
    url: null,
    embedUrl: null,
    thumbnailUrl: null,
    creatorName,
    broadcasterName,
    viewCount,
    durationSeconds: 20 + ((index * 7) % 40),
    createdAt: new Date(now.getTime() - daysAgo * 86_400_000 - index * 3_600_000).toISOString(),
  })

  return [
    clip(1, 'Demo-Clip: Der erste Gilden-Run', 1, 412, 'Frostblüte'),
    clip(2, 'Demo-Clip: Knapp überlebt', 2, 1280, 'Brummbart'),
    clip(3, 'Demo-Clip: Pull ohne Tank', 4, 256, 'Nebelpfote'),
    clip(4, 'Demo-Clip: Episches Loot', 6, 2045, 'Laternchen'),
    clip(5, 'Demo-Clip: Gruppenfoto in Eisenschmiede', 9, 188, 'Teepause'),
    clip(6, 'Demo-Clip: Der Fisch des Jahres', 13, 734, 'Glimmerfee'),
    clip(7, 'Demo-Clip: Verlaufen im Kloster', 21, 3310, 'Mondsichel'),
    clip(8, 'Demo-Clip: Stufe 60 geschafft', 35, 5120, 'Kupferkessel'),
  ]
}

export function createDemoStreamStatus(now: Date, channel: string, simulateLive: boolean): StreamStatus {
  return {
    channel,
    isLive: simulateLive,
    title: simulateLive ? 'Demo-Stream: Gemeinsam durch Azeroth' : null,
    gameName: simulateLive ? 'World of Warcraft' : null,
    // volle Stunde, damit derselbe Demo-Stream über mehrere Anfragen gleich bleibt (Live-Hinweis wegklicken)
    startedAt: simulateLive ? new Date(Math.floor(now.getTime() / 3_600_000) * 3_600_000 - 3_600_000).toISOString() : null,
    checkedAt: now.toISOString(),
  }
}

/** Fiktive weitere Gilden-Streamer – im Live-Betrieb kommen sie aus einer Konfigurationsdatei. */
export const demoStreamers: Streamer[] = [
  { id: 'demo-streamer-1', twitchId: 'demo-twitch-1', login: 'demo_frostbluete', displayName: 'Frostblüte (Demo)', avatarUrl: null, memberId: 'demo-member-01', isLive: true },
  { id: 'demo-streamer-2', twitchId: 'demo-twitch-2', login: 'demo_brummbart', displayName: 'Brummbart (Demo)', avatarUrl: null, memberId: 'demo-member-02', isLive: false },
  { id: 'demo-streamer-3', twitchId: 'demo-twitch-3', login: 'demo_gaststreamer', displayName: 'Gaststreamer (Demo)', avatarUrl: null, memberId: null, isLive: false },
]
