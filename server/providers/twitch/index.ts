import type { Clip, StreamStatus, Streamer } from '#shared/types'
import type { StreamerEntry } from '../../../content/streamers'
import { createTtlCache } from '../../lib/http'
import type { TwitchProvider } from '../types'
import type { TwitchClient } from './client'
import type { HelixClip, HelixStream } from './schemas'

export { createTwitchClient } from './client'

const STATUS_TTL = 60_000
const CLIPS_TTL = 15 * 60_000
const STREAMERS_TTL = 60_000
const GAMES_TTL = 24 * 60 * 60_000
/** höchstens so viele Clip-Seiten (je 100) durchsuchen, um genug passende Clips zu finden */
const MAX_CLIP_PAGES = 5
/** bei weiteren Gilden-Streamern weniger Seiten durchsuchen */
const MAX_EXTRA_CLIP_PAGES = 2
const DAY = 86_400_000
const periodDays = { '7d': 7, '30d': 30, 'all': null } as const

export interface TwitchProviderConfig {
  broadcasterId: string
  channel: string
  streamers: StreamerEntry[]
  /** Mitglieder mit Discord-Rolle „Streamer“ und selbst eingetragenem Twitch-Kanal (aus der Datenbank) */
  memberStreamers?: () => Promise<{ memberId: string, twitchLogin: string }[]>
  /** Nur Clips aus diesen Twitch-Kategorien (exakte Namen); leer = alle Clips */
  clipGames?: string[]
}

/** Twitch aktualisiert Live-Vorschaubilder etwa alle 5 Minuten – so oft auch einen neuen Cache-Schlüssel */
const PREVIEW_BUCKET_MS = 5 * 60_000

/** Live-Vorschaubild in 640×360; nur vom Twitch-CDN (das ist auch für die Bildauslieferung freigegeben) */
export function streamPreviewUrl(template: string | null | undefined, checkedAt: Date): string | null {
  if (!template?.startsWith('https://static-cdn.jtvnw.net/')) return null
  const url = template.replace('{width}', '640').replace('{height}', '360')
  return `${url}?t=${Math.floor(checkedAt.getTime() / PREVIEW_BUCKET_MS)}`
}

export function streamToStatus(channel: string, stream: HelixStream | undefined, checkedAt: Date): StreamStatus {
  const live = stream?.type === 'live'
  return {
    channel,
    isLive: live,
    title: live ? stream.title || null : null,
    gameName: live ? stream.game_name || null : null,
    startedAt: live ? new Date(stream.started_at).toISOString() : null,
    thumbnailUrl: live ? streamPreviewUrl(stream.thumbnail_url, checkedAt) : null,
    checkedAt: checkedAt.toISOString(),
  }
}

export function helixClipToClip(clip: HelixClip): Clip {
  return {
    id: clip.id,
    title: clip.title.trim() || 'Clip ohne Titel',
    url: clip.url,
    embedUrl: clip.embed_url,
    thumbnailUrl: clip.thumbnail_url || null,
    creatorName: clip.creator_name,
    broadcasterName: clip.broadcaster_name,
    viewCount: clip.view_count,
    durationSeconds: clip.duration,
    createdAt: new Date(clip.created_at).toISOString(),
  }
}

export function createTwitchProvider(client: TwitchClient, config: TwitchProviderConfig, now = () => new Date()): TwitchProvider {
  const cache = createTtlCache()

  /** Kategorie-Namen → IDs; `null` = nicht filtern (keine Namen oder keiner gefunden) */
  async function resolveClipGames(): Promise<Set<string> | null> {
    const names = config.clipGames ?? []
    if (!names.length) return null
    const ids = await cache.get('clip-games', GAMES_TTL, async () => (await client.getGames(names)).map(game => game.id))
    if (!ids.length) {
      console.warn('[twitch] Keine der Clip-Kategorien gefunden – zeige alle Clips:', names.join(', '))
      return null
    }
    return new Set(ids)
  }

  const provider: TwitchProvider = {
    getStreamStatus() {
      return cache.get('status', STATUS_TTL, async () => {
        const [stream] = await client.getStreams({ userIds: [config.broadcasterId] })
        return streamToStatus(config.channel, stream, now())
      })
    },

    async listClips(query) {
      const days = periodDays[query.period]
      const clips = await cache.get(`clips:${query.period}`, CLIPS_TTL, async () => {
        const startedAt = days === null ? undefined : new Date(now().getTime() - days * DAY).toISOString()
        const endedAt = days === null ? undefined : now().toISOString()
        const gameIds = await resolveClipGames()

        // Ohne Kategorie-Filter reicht eine Seite (100 = Maximum); mit Filter weitere Seiten, bis 100 passen
        async function clipsOf(broadcasterId: string, maxPages: number): Promise<HelixClip[]> {
          const matching: HelixClip[] = []
          let after: string | undefined
          for (let page = 0; page < (gameIds ? maxPages : 1); page++) {
            const result = await client.getClipsPage(broadcasterId, { first: 100, startedAt, endedAt, after })
            matching.push(...result.clips.filter(clip => !gameIds || gameIds.has(clip.game_id)))
            if (!result.cursor || matching.length >= 100) break
            after = result.cursor
          }
          return matching
        }

        // Weitere Gilden-Streamer nur mit Kategorie-Filter (sonst kämen fremde Spiele dazu);
        // fällt einer aus, bleiben die übrigen Clips trotzdem sichtbar
        const extraIds = gameIds
          ? (await provider.listStreamers().catch(() => [] as Streamer[])).map(streamer => streamer.twitchId).filter(id => id !== config.broadcasterId)
          : []
        const [own, ...extra] = await Promise.all([
          clipsOf(config.broadcasterId, MAX_CLIP_PAGES),
          ...extraIds.map(id => clipsOf(id, MAX_EXTRA_CLIP_PAGES).catch(() => [] as HelixClip[])),
        ])
        return [...own!, ...extra.flat()]
          .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
          .slice(0, 100)
          .map(helixClipToClip)
      })
      return [...clips]
        .sort((a, b) => query.sort === 'popular' ? b.viewCount - a.viewCount : Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, query.limit)
    },

    listStreamers() {
      return cache.get('streamers', STREAMERS_TTL, async (): Promise<Streamer[]> => {
        const fromMembers = config.memberStreamers
          ? await config.memberStreamers().catch((error: unknown) => {
              console.warn('[twitch] Streamer aus der Datenbank nicht lesbar:', error instanceof Error ? error.message : 'unbekannt')
              return []
            })
          : []
        // Fest eingetragene Streamer haben Vorrang; Miinyu selbst hat einen eigenen Bereich
        const entries = [...config.streamers]
        for (const member of fromMembers) {
          if (!entries.some(entry => entry.login.toLowerCase() === member.twitchLogin)) entries.push({ login: member.twitchLogin, discordId: member.memberId })
        }
        const logins = entries.map(entry => entry.login.toLowerCase()).filter(login => login !== config.channel.toLowerCase())
        if (!logins.length) return []
        const [users, streams] = await Promise.all([client.getUsers(logins), client.getStreams({ logins })])
        const live = new Set(streams.filter(stream => stream.type === 'live').map(stream => stream.user_id))
        return users.map((user) => {
          const entry = entries.find(item => item.login.toLowerCase() === user.login.toLowerCase())
          return {
            id: `twitch-${user.id}`,
            twitchId: user.id,
            login: user.login,
            displayName: user.display_name,
            avatarUrl: user.profile_image_url || null,
            memberId: entry?.discordId ?? null,
            isLive: live.has(user.id),
          }
        })
      })
    },
  }
  return provider
}
