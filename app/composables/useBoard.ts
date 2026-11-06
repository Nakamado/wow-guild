import { activeBoardNotes, checkBoardInput } from '#shared/domain/board'
import { fail, ok, type DomainResult } from '#shared/domain/result'
import { BoardNoteInputSchema } from '#shared/schemas/board'
import type { BoardNote } from '#shared/types'

export const DEMO_BOARD_STORAGE_KEY = 'wow-guild:demo-board'

export interface BoardDraft {
  title: string
  text: string
  /** YYYY-MM-DD oder leer */
  expiresOn: string
}

/** Demo-Änderungen: Aushang-Snapshots nach ID, `null` = entfernt */
const useDemoBoardOverrides = () => useState<Record<string, BoardNote | null>>('demo-board-overrides', () => ({}))

/**
 * Schwarzes Brett lesen und (als Admin) pflegen.
 * - Demo: Änderungen nur im sessionStorage dieses Tabs, mit denselben Regeln wie der Server
 * - Live: über die API (Supabase)
 */
export function useBoard() {
  const { isDemo } = useSiteConfig()
  const { viewer, can } = useViewer()
  const canView = computed(() => can('board:view'))
  const canManage = computed(() => can('board:manage'))
  const overrides = useDemoBoardOverrides()

  const { data, status, refresh } = useProtectedFetchSync<BoardNote[]>('board', '/api/board', canView)

  onMounted(() => {
    if (!isDemo) return
    try {
      const stored = JSON.parse(sessionStorage.getItem(DEMO_BOARD_STORAGE_KEY) ?? '{}') as Record<string, BoardNote | null>
      overrides.value = { ...stored, ...overrides.value }
    }
    catch {
      // Speicher nicht verfügbar oder kaputt – Demo startet frisch
    }
  })

  const notes = computed(() => {
    const byId = new Map((data.value ?? []).map(note => [note.id, note]))
    for (const [id, note] of Object.entries(overrides.value)) {
      if (note) byId.set(id, note)
      else byId.delete(id)
    }
    return activeBoardNotes([...byId.values()], new Date())
  })

  function saveDemo(id: string, note: BoardNote | null) {
    overrides.value = { ...overrides.value, [id]: note }
    try {
      sessionStorage.setItem(DEMO_BOARD_STORAGE_KEY, JSON.stringify(overrides.value))
    }
    catch {
      // nur bis zum Neuladen
    }
  }

  function parse(draft: BoardDraft): DomainResult<ReturnType<typeof BoardNoteInputSchema.parse>> {
    const parsed = BoardNoteInputSchema.safeParse(draft)
    if (!parsed.success) return fail('invalid', parsed.error.issues[0]?.message ?? 'Bitte prüfe deine Eingaben.')
    return checkBoardInput(parsed.data, new Date())
  }

  async function save(draft: BoardDraft, id?: string): Promise<DomainResult<BoardNote>> {
    if (!canManage.value) return fail('not-allowed', 'Nur Admins können Aushänge bearbeiten.')
    const input = parse(draft)
    if (!input.ok) return input
    if (isDemo) {
      const now = new Date().toISOString()
      const existing = id ? notes.value.find(note => note.id === id) : undefined
      const note: BoardNote = {
        id: id ?? `demo-note-${crypto.randomUUID()}`,
        title: input.value.title,
        text: input.value.text,
        expiresOn: input.value.expiresOn,
        createdBy: existing?.createdBy ?? viewer.value.memberId ?? 'demo',
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
        isDemo: true,
      }
      saveDemo(note.id, note)
      return ok(note)
    }
    const result = await apiResult(() => (id
      ? $fetch<BoardNote>(`/api/board/${id}` as string, { method: 'PATCH', body: input.value })
      : $fetch<BoardNote>('/api/board', { method: 'POST', body: input.value })))
    if (result.ok) await refresh()
    return result
  }

  async function remove(id: string): Promise<DomainResult<null>> {
    if (!canManage.value) return fail('not-allowed', 'Nur Admins können Aushänge entfernen.')
    if (isDemo) {
      saveDemo(id, null)
      return ok(null)
    }
    const result = await apiResult(() => $fetch<null>(`/api/board/${id}` as string, { method: 'DELETE' }))
    if (result.ok) await refresh()
    return result.ok ? ok(null) : result
  }

  return { notes, status, canView, canManage, save, remove }
}
