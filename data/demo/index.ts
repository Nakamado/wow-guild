import type {
  Character,
  Clip,
  CommunityMember,
  DiscordEvent,
  GroupRun,
  Streamer,
  StreamStatus,
} from '../../shared/types'
import { createDemoCharacters } from './characters'
import { createDemoDiscordEvents } from './events'
import { demoMembers } from './members'
import { createDemoRuns } from './runs'
import { createDemoClips, createDemoStreamStatus, demoStreamers } from './twitch'

export interface DemoDataset {
  generatedAt: string
  members: CommunityMember[]
  characters: Character[]
  runs: GroupRun[]
  discordEvents: DiscordEvent[]
  clips: Clip[]
  streamers: Streamer[]
  streamStatus: StreamStatus
}

export interface DemoOptions {
  twitchChannel?: string
  /** Livestatus im Hero simulieren */
  simulateLive?: boolean
}

/**
 * Erzeugt den kompletten, in sich stimmigen Demo-Datensatz.
 * Termine sind relativ zu `now`, damit die Demo immer kommende Events zeigt.
 * Konsistenz (Referenzen, Geschäftsregeln) wird in tests/unit/demo-data.test.ts geprüft.
 */
export function createDemoDataset(now: Date = new Date(), options: DemoOptions = {}): DemoDataset {
  const channel = options.twitchChannel ?? 'miinyu'
  return {
    generatedAt: now.toISOString(),
    members: demoMembers.map(member => ({ ...member })),
    characters: createDemoCharacters(now),
    runs: createDemoRuns(now),
    discordEvents: createDemoDiscordEvents(now),
    clips: createDemoClips(now, channel),
    streamers: demoStreamers.map(streamer => ({ ...streamer })),
    streamStatus: createDemoStreamStatus(now, channel, options.simulateLive ?? false),
  }
}
