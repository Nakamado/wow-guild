import type { Character, CommunityMember, Dungeon, GroupRun } from '../../shared/types'

export const NOW = new Date('2026-11-04T12:00:00.000Z')
export const IN_ONE_DAY = '2026-11-05T18:00:00.000Z'

export const dungeon: Dungeon = {
  slug: 'test-dungeon',
  name: 'Testgewölbe',
  nameEn: 'Test Vault',
  abbreviation: 'TV',
  description: '',
  zone: 'Testzone',
  kind: 'dungeon',
  levelRange: { min: 20, max: 26 },
  minLevel: 15,
  groupSize: 5,
  isNewInForever: false,
  image: null,
  note: null,
  sourceIds: ['warcrafttavern-forever-dungeons'],
}

export function member(id: string, overrides: Partial<CommunityMember> = {}): CommunityMember {
  return {
    id,
    discordId: `d-${id}`,
    displayName: id,
    avatarUrl: null,
    profileUrl: null,
    preferredRoles: [],
    isGuildMember: true,
    isAdmin: false,
    source: 'demo',
    ...overrides,
  }
}

export function character(id: string, memberId: string, overrides: Partial<Character> = {}): Character {
  return {
    id,
    memberId,
    name: 'Testheld Mustermann',
    realm: 'Test',
    faction: 'alliance',
    classId: 'warrior',
    raceId: 'human',
    level: 22,
    roles: ['tank', 'dps'],
    isMain: true,
    source: 'demo',
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}

export function run(overrides: Partial<GroupRun> = {}): GroupRun {
  return {
    id: 'run-1',
    dungeonSlug: dungeon.slug,
    title: null,
    description: '',
    startsAt: IN_ONE_DAY,
    organizerId: 'm-org',
    status: 'open',
    capacity: { tank: 1, healer: 1, dps: 3 },
    participants: [],
    waitlistEnabled: false,
    waitlist: [],
    discordEventId: null,
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  }
}
