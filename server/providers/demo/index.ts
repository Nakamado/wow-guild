import type { DemoDataset } from '../../../data/demo'
import type {
  CharacterProvider,
  ClipQuery,
  DiscordEventProvider,
  DiscordMemberProvider,
  GroupRepository,
  TwitchProvider,
} from '../types'

const DAY = 86_400_000
const periodDays = { '7d': 7, '30d': 30, 'all': Number.POSITIVE_INFINITY } as const

/** Kopien zurückgeben, damit Aufrufer den Datensatz nicht versehentlich verändern. */
const clone = <T>(value: T): T => structuredClone(value)

export function createDemoMemberProvider(data: DemoDataset): DiscordMemberProvider {
  return {
    async listGuildMembers() {
      return clone(data.members.filter(member => member.isGuildMember))
    },
    async getMember(id) {
      const member = data.members.find(entry => entry.id === id)
      return member ? clone(member) : null
    },
  }
}

export function createDemoCharacterProvider(data: DemoDataset): CharacterProvider {
  return {
    async list() {
      return clone(data.characters)
    },
    async listByMember(memberId) {
      return clone(data.characters.filter(character => character.memberId === memberId))
    },
    async get(id) {
      const character = data.characters.find(entry => entry.id === id)
      return character ? clone(character) : null
    },
  }
}

export function createDemoDiscordEventProvider(data: DemoDataset): DiscordEventProvider {
  return {
    async listScheduledEvents() {
      return clone(data.discordEvents)
    },
  }
}

export function filterClips(clips: DemoDataset['clips'], query: ClipQuery, now: Date) {
  const since = now.getTime() - periodDays[query.period] * DAY
  return clips
    .filter(clip => Date.parse(clip.createdAt) >= since)
    .sort((a, b) =>
      query.sort === 'popular'
        ? b.viewCount - a.viewCount
        : Date.parse(b.createdAt) - Date.parse(a.createdAt),
    )
    .slice(0, query.limit)
}

export function createDemoTwitchProvider(data: DemoDataset): TwitchProvider {
  const now = new Date(data.generatedAt)
  return {
    async getStreamStatus() {
      return clone(data.streamStatus)
    },
    async listClips(query) {
      return clone(filterClips(data.clips, query, now))
    },
    async listStreamers() {
      return clone(data.streamers)
    },
  }
}

/** Nur lesend – Demo-Schreibzugriffe laufen clientseitig über sessionStorage (Phase 4). */
export function createDemoGroupRepository(data: DemoDataset): GroupRepository {
  return {
    async list() {
      return clone(data.runs)
    },
    async get(id) {
      const run = data.runs.find(entry => entry.id === id)
      return run ? clone(run) : null
    },
  }
}
