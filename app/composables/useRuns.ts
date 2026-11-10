import { dungeons, findDungeon } from '#shared/data/dungeons'
import { raids } from '#shared/data/raids'
import { fail, ok, type DomainResult } from '#shared/domain/result'
import {
  cancelRun as cancelRunRule,
  joinRun as joinRunRule,
  leaveRun as leaveRunRule,
  validateRunDraft,
  type JoinCheck,
} from '#shared/domain/runs'
import type { Character, CommunityMember, GroupRun, RoleId, RunInput } from '#shared/types'

export const DEMO_RUNS_STORAGE_KEY = 'wow-guild:demo-runs'

/** Lokale Demo-Änderungen: vollständige Run-Snapshots, die Server-Runs gleicher ID ersetzen. */
export const useDemoRunOverrides = () => useState<Record<string, GroupRun>>('demo-run-overrides', () => ({}))

export interface JoinOutcome {
  run: GroupRun
  check: JoinCheck
}

export interface LeaveOutcome {
  run: GroupRun
  /** Mitglied, das von der Warteliste nachgerückt ist */
  promotedMemberId: string | null
}

type MemberDirectory = (CommunityMember & { characters: Character[] })[]

/**
 * Runs lesen und verändern.
 * - Demo: lokal im sessionStorage, mit denselben Regeln wie der Server (shared/domain/runs.ts)
 * - Live: über die API; Plätze vergibt Postgres atomar (`join_run()`)
 */
export function useRuns() {
  const { isDemo } = useSiteConfig()
  const { viewer, can } = useViewer()
  const overrides = useDemoRunOverrides()

  const { data: serverRuns, status, error, refresh } = useFetch<GroupRun[]>('/api/runs', { key: 'runs', default: () => [] })

  const canSeeMembers = computed(() => can('members:view'))

  const { mine: myCharacters } = useCharacters()
  const { data: directory } = useProtectedFetchSync<MemberDirectory>('members', '/api/members', canSeeMembers)

  const runs = computed<GroupRun[]>(() => {
    const byId = new Map((serverRuns.value ?? []).map(run => [run.id, run]))
    for (const [id, run] of Object.entries(overrides.value)) byId.set(id, run)
    return [...byId.values()].sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
  })

  const memberById = computed(() => new Map((directory.value ?? []).map(member => [member.id, member])))
  const characterById = computed(() => new Map(
    [...(directory.value ?? []).flatMap(member => member.characters), ...myCharacters.value].map(character => [character.id, character]),
  ))

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

  /** Live: Server-Antwort in die geladene Liste übernehmen */
  function upsert(run: GroupRun) {
    serverRuns.value = [...(serverRuns.value ?? []).filter(entry => entry.id !== run.id), run]
  }

  async function live<T extends { run: GroupRun | null } | GroupRun>(request: () => Promise<T>): Promise<DomainResult<T>> {
    const result = await apiResult(request)
    if (result.ok) {
      const value = result.value as { run?: GroupRun | null } & Partial<GroupRun>
      const run = 'run' in value ? value.run : (value as GroupRun)
      if (run) upsert(run)
      else await refresh()
    }
    return result
  }

  async function createRun(input: RunInput): Promise<DomainResult<GroupRun>> {
    if (!can('runs:create') || !viewer.value.memberId) return fail('not-allowed', 'Nur Gildenmitglieder können Gruppen erstellen.')
    if (!isDemo) return live(() => $fetch<GroupRun>('/api/runs', { method: 'POST', body: input }))
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
      questIds: input.questIds ?? [],
      discordEventId: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    }
    persist(run)
    return ok(run)
  }

  async function updateRun(id: string, input: RunInput): Promise<DomainResult<GroupRun>> {
    const run = getRun(id)
    if (!run) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!can('runs:edit', { organizerId: run.organizerId })) return fail('not-allowed', 'Nur die Organisation oder ein Admin kann diese Gruppe bearbeiten.')
    if (run.status !== 'open') return fail('run-not-open', 'Abgesagte oder abgeschlossene Gruppen lassen sich nicht mehr bearbeiten.')
    if (!isDemo) return live(() => $fetch<GroupRun>(`/api/runs/${id}`, { method: 'PATCH', body: input }))
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
      questIds: input.questIds ?? [],
      updatedAt: new Date().toISOString(),
    }
    persist(updated)
    return ok(updated)
  }

  async function cancelRun(id: string): Promise<DomainResult<GroupRun>> {
    const run = getRun(id)
    if (!run) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!can('runs:cancel', { organizerId: run.organizerId })) return fail('not-allowed', 'Nur die Organisation oder ein Admin kann diese Gruppe absagen.')
    if (!isDemo) return live(() => $fetch<GroupRun>(`/api/runs/${id}/cancel`, { method: 'POST' }))
    const result = cancelRunRule(run, new Date())
    if (result.ok) persist(result.value)
    return result
  }

  async function joinRun(id: string, characterId: string, role: RoleId, support = false): Promise<DomainResult<JoinOutcome>> {
    const run = getRun(id)
    const dungeon = run ? findDungeon(run.dungeonSlug) : undefined
    const character = myCharacters.value.find(entry => entry.id === characterId)
    if (!run || !dungeon) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!can('runs:join') || !viewer.value.memberId) return fail('not-allowed', 'Nur Gildenmitglieder können Gruppen beitreten.')
    if (!character) return fail('character-not-owned', 'Bitte wähle einen deiner Charaktere aus.')

    if (!isDemo) {
      type Response = { placement: JoinCheck['placement'], warnings: string[], run: GroupRun | null }
      const result = await live(() => $fetch<Response>(`/api/runs/${id}/join`, { method: 'POST', body: { characterId, role, support } }))
      if (!result.ok) return result
      const { placement, warnings } = result.value
      return ok({ run: result.value.run ?? run, check: { placement, warnings } })
    }

    const result = joinRunRule({
      run,
      dungeon,
      member: { id: viewer.value.memberId, isGuildMember: true },
      character,
      role,
      support,
      now: new Date(),
    })
    if (result.ok) persist(result.value.run)
    return result
  }

  async function leaveRun(id: string): Promise<DomainResult<LeaveOutcome>> {
    const run = getRun(id)
    if (!run) return fail('not-found', 'Diese Gruppe gibt es nicht (mehr).')
    if (!viewer.value.memberId) return fail('not-allowed', 'Bitte melde dich an.')

    if (!isDemo) {
      const result = await live(() => $fetch<{ promoted: string | null, run: GroupRun | null }>(`/api/runs/${id}/leave`, { method: 'POST' }))
      if (!result.ok) return result
      return ok({ run: result.value.run ?? run, promotedMemberId: result.value.promoted })
    }

    const result = leaveRunRule(run, viewer.value.memberId, new Date())
    if (!result.ok) return result
    persist(result.value.run)
    return ok({ run: result.value.run, promotedMemberId: result.value.promoted?.memberId ?? null })
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
    myCharacters,
    memberById,
    characterById,
    hasDemoChanges: computed(() => Object.keys(overrides.value).length > 0),
    dungeons,
    raids,
    createRun,
    updateRun,
    cancelRun,
    joinRun,
    leaveRun,
    resetDemoChanges,
    myEntry,
  }
}
