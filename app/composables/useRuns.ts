import { dungeons, findDungeon } from '#shared/data/dungeons'
import { fail, ok, type DomainResult } from '#shared/domain/result'
import {
  cancelRun as cancelRunRule,
  joinRun as joinRunRule,
  leaveRun as leaveRunRule,
  validateRunDraft,
  type RunDraft,
} from '#shared/domain/runs'
import type { Character, CommunityMember, GroupRun, RoleId } from '#shared/types'

export const DEMO_RUNS_STORAGE_KEY = 'wow-guild:demo-runs'

/** Lokale Demo-Änderungen: vollständige Run-Snapshots, die Server-Runs gleicher ID ersetzen. */
export const useDemoRunOverrides = () => useState<Record<string, GroupRun>>('demo-run-overrides', () => ({}))

export interface RunInput extends RunDraft {
  dungeonSlug: string
  title: string | null
  waitlistEnabled: boolean
}

type MemberDirectory = (CommunityMember & { characters: Character[] })[]

/**
 * Runs lesen und (im Demo-Modus) verändern. Alle Änderungen laufen durch die gleichen
 * Geschäftsregeln wie später auf dem Server (shared/domain/runs.ts).
 */
export function useRuns() {
  const { isDemo } = useSiteConfig()
  const { viewer, can } = useViewer()
  const overrides = useDemoRunOverrides()

  const { data: serverRuns, status, error, refresh } = useFetch<GroupRun[]>('/api/runs', { key: 'runs', default: () => [] })

  const canJoin = computed(() => can('runs:join'))
  const canSeeMembers = computed(() => can('members:view'))

  const { data: myCharacters } = useProtectedFetchSync<Character[]>('my-characters', '/api/me/characters', canJoin)
  const { data: directory } = useProtectedFetchSync<MemberDirectory>('members', '/api/members', canSeeMembers)

  const runs = computed<GroupRun[]>(() => {
    const byId = new Map((serverRuns.value ?? []).map(run => [run.id, run]))
    for (const [id, run] of Object.entries(overrides.value)) byId.set(id, run)
    return [...byId.values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  })

  const memberById = computed(() => new Map((directory.value ?? []).map(member => [member.id, member])))
  const characterById = computed(() => new Map((directory.value ?? []).flatMap(member => member.characters).map(character => [character.id, character])))

  function getRun(id: string) {
    return runs.value.find(run => run.id === id) ?? null
  }

  function persist(run: GroupRun) {
    overrides.value = { ...overrides.value, [run.id]: run }
    try {
      sessionStorage.setItem(DEMO_RUNS_STORAGE_KEY, JSON.stringify(overrides.value))
    }
    catch {
      // Speicher nicht verfügbar – Änderung gilt nur bis zum Neuladen
    }
  }

  function guard(): DomainResult<true, 'not-available' | 'not-allowed'> {
    if (!isDemo) return fail('not-available', 'Gruppen lassen sich bald direkt hier verwalten. Bis dahin plant ihr im Discord.')
    return ok(true)
  }

  function createRun(input: RunInput): DomainResult<GroupRun> {
    const available = guard()
    if (!available.ok) return available
    if (!can('runs:create') || !viewer.value.memberId) return fail('not-allowed', 'Nur Gildenmitglieder können Gruppen erstellen.')
    const dungeon = findDungeon(input.dungeonSlug)
    if (!dungeon) return fail('unknown-dungeon', 'Bitte wähle einen Dungeon aus.')

    const now = new Date()
    const draft = validateRunDraft(input, dungeon, now)
    if (!draft.ok) return draft

    const run: GroupRun = {
      id: `demo-run-${crypto.randomUUID()}`,
      dungeonSlug: dungeon.slug,
      title: input.title?.trim() || null,
      description: input.description.trim(),
      startsAt: input.startsAt,
      organizerId: viewer.value.memberId,
      status: 'open',
      capacity: input.capacity,
      participants: [],
      waitlistEnabled: input.waitlistEnabled,
      waitlist: [],
      discordEventId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    persist(run)
    return ok(run)
  }

  function updateRun(id: string, input: RunInput): DomainResult<GroupRun> {
    const available = guard()
    if (!available.ok) return available
    const run = getRun(id)
    if (!run) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!can('runs:edit', { organizerId: run.organizerId })) return fail('not-allowed', 'Nur die Organisation oder die Gildenleitung kann diese Gruppe bearbeiten.')
    if (run.status !== 'open') return fail('run-not-open', 'Abgesagte oder abgeschlossene Gruppen lassen sich nicht mehr bearbeiten.')
    const dungeon = findDungeon(input.dungeonSlug)
    if (!dungeon) return fail('unknown-dungeon', 'Bitte wähle einen Dungeon aus.')

    const draft = validateRunDraft(input, dungeon, new Date(), run)
    if (!draft.ok) return draft
    const updated: GroupRun = {
      ...run,
      dungeonSlug: dungeon.slug,
      title: input.title?.trim() || null,
      description: input.description.trim(),
      startsAt: input.startsAt,
      capacity: input.capacity,
      waitlistEnabled: input.waitlistEnabled,
      updatedAt: new Date().toISOString(),
    }
    persist(updated)
    return ok(updated)
  }

  function cancelRun(id: string): DomainResult<GroupRun> {
    const available = guard()
    if (!available.ok) return available
    const run = getRun(id)
    if (!run) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!can('runs:cancel', { organizerId: run.organizerId })) return fail('not-allowed', 'Nur die Organisation oder die Gildenleitung kann diese Gruppe absagen.')
    const result = cancelRunRule(run, new Date())
    if (result.ok) persist(result.value)
    return result
  }

  function joinRun(id: string, characterId: string, role: RoleId) {
    const available = guard()
    if (!available.ok) return available
    const run = getRun(id)
    const dungeon = run ? findDungeon(run.dungeonSlug) : undefined
    const character = myCharacters.value?.find(entry => entry.id === characterId)
    if (!run || !dungeon) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!can('runs:join') || !viewer.value.memberId) return fail('not-allowed', 'Nur Gildenmitglieder können Gruppen beitreten.')
    if (!character) return fail('character-not-owned', 'Bitte wähle einen deiner Charaktere aus.')

    const result = joinRunRule({
      run,
      dungeon,
      member: { id: viewer.value.memberId, isGuildMember: true },
      character,
      role,
      now: new Date(),
    })
    if (result.ok) persist(result.value.run)
    return result
  }

  function leaveRun(id: string) {
    const available = guard()
    if (!available.ok) return available
    const run = getRun(id)
    if (!run) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!viewer.value.memberId) return fail('not-allowed', 'Bitte melde dich an.')
    const result = leaveRunRule(run, viewer.value.memberId, new Date())
    if (result.ok) persist(result.value.run)
    return result
  }

  function resetDemoChanges() {
    overrides.value = {}
    try {
      sessionStorage.removeItem(DEMO_RUNS_STORAGE_KEY)
    }
    catch {
      // ignorieren
    }
  }

  /** Ist der aktuelle Betrachter in diesem Run angemeldet (fest oder Warteliste)? */
  function myEntry(run: GroupRun) {
    const memberId = viewer.value.memberId
    if (!memberId) return null
    const participant = run.participants.find(entry => entry.memberId === memberId)
    if (participant) return { ...participant, placement: 'participant' as const }
    const waiting = run.waitlist.find(entry => entry.memberId === memberId)
    return waiting ? { ...waiting, placement: 'waitlist' as const } : null
  }

  return {
    runs,
    status,
    error,
    refresh,
    getRun,
    myCharacters: computed(() => myCharacters.value ?? []),
    memberById,
    characterById,
    hasDemoChanges: computed(() => Object.keys(overrides.value).length > 0),
    dungeons,
    createRun,
    updateRun,
    cancelRun,
    joinRun,
    leaveRun,
    resetDemoChanges,
    myEntry,
  }
}
