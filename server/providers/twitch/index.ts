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
const DAY = 86_400_000
const periodDays = { '7d': 7, '30d': 30, 'all': null } as const

export interface TwitchProviderConfig {
  broadcasterId: string
  channel: string
  streamers: StreamerEntry[]
}

export function streamToStatus(channel: string, stream: HelixStream | undefined, checkedAt: Date): StreamStatus {
  const live = stream?.type === 'live'
  return {
    channel,
    isLive: live,
    title: live ? stream.title || null : null,
    gameName: live ? stream.game_name || null : null,
    viewerCount: live ? stream.viewer_count : null,
    startedAt: live ? new Date(stream.started_at).toISOString() : null,
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

  return {
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
        // 100 = Maximum pro Seite; reicht für „neueste“ und „beliebteste“ Auswahl
        return (await client.getClips(config.broadcasterId, { first: 100, startedAt })).map(helixClipToClip)
      })
      return [...clips]
        .sort((a, b) => query.sort === 'popular' ? b.viewCount - a.viewCount : Date.parse(b.createdAt) - Date.parse(a.createdAt))
        .slice(0, query.limit)
    },

    listStreamers() {
      return cache.get('streamers', STREAMERS_TTL, async (): Promise<Streamer[]> => {
        const logins = config.streamers.map(entry => entry.login.toLowerCase())
        if (!logins.length) return []
        const [users, streams] = await Promise.all([client.getUsers(logins), client.getStreams({ logins })])
        const live = new Set(streams.filter(stream => stream.type === 'live').map(stream => stream.user_id))
        return users.map((user) => {
          const entry = config.streamers.find(item => item.login.toLowerCase() === user.login.toLowerCase())
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
}
