import { checkGuildEventInput } from '#shared/domain/guild-events'
import { fail, ok, type DomainResult } from '#shared/domain/result'
import { GuildEventInputSchema } from '#shared/schemas/guild-events'
import type { GuildEvent, GuildEventInput } from '#shared/types'

export const DEMO_GUILD_EVENTS_STORAGE_KEY = 'wow-guild:demo-guild-events'

/** Formularwerte: Datum/Uhrzeit als Eingaben in deutscher Zeit */
export interface GuildEventDraft {
  title: string
  description: string
  /** YYYY-MM-DD */
  date: string
  /** HH:mm */
  time: string
  /** HH:mm oder leer */
  endTime: string
  location: string
}

/** Demo-Änderungen: Event-Snapshots nach ID */
const useDemoOverrides = () => useState<Record<string, GuildEvent>>('demo-guild-event-overrides', () => ({}))
/** Demo: gelöschte Events (nur bis zum Neuladen) */
const useDemoDeleted = () => useState<string[]>('demo-guild-event-deleted', () => [])

/**
 * Gilden-Events lesen und eintragen/bearbeiten/absagen.
 * - Demo: Änderungen nur im sessionStorage dieses Tabs, mit denselben Regeln wie der Server
 * - Live: über die API (Supabase)
 */
export function useGuildEvents() {
  const { isDemo } = useSiteConfig()
  const { viewer, can } = useViewer()
  const overrides = useDemoOverrides()
  const deleted = useDemoDeleted()
  const canCreate = computed(() => can('events:create'))

  const { data, status, refresh } = useFetch<GuildEvent[]>('/api/guild-events', { key: 'guild-events', default: () => [] })

  onMounted(() => {
    if (!isDemo) return
    try {
      const stored = JSON.parse(sessionStorage.getItem(DEMO_GUILD_EVENTS_STORAGE_KEY) ?? '{}') as Record<string, GuildEvent>
      overrides.value = { ...stored, ...overrides.value }
    }
    catch {
      // Speicher nicht verfügbar oder kaputt – Demo startet frisch
    }
  })

  const events = computed(() => {
    const byId = new Map((data.value ?? []).map(entry => [entry.id, entry]))
    for (const [id, entry] of Object.entries(overrides.value)) byId.set(id, entry)
    for (const id of deleted.value) byId.delete(id)
    return [...byId.values()].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  })

  const getEvent = (id: string) => events.value.find(entry => entry.id === id) ?? null
  const canDelete = (entry: Pick<GuildEvent, 'createdBy'>) => can('events:edit', { organizerId: entry.createdBy })
  const canEdit = (entry: Pick<GuildEvent, 'createdBy' | 'status'>) => entry.status === 'scheduled' && canDelete(entry)

  function saveDemo(entry: GuildEvent) {
    overrides.value = { ...overrides.value, [entry.id]: entry }
    try {
      sessionStorage.setItem(DEMO_GUILD_EVENTS_STORAGE_KEY, JSON.stringify(overrides.value))
    }
    catch {
      // nur bis zum Neuladen
    }
  }

  /** Formular → geprüfte Eingabe (Ende am selben Tag, über Mitternacht am Folgetag) */
  function parse(draft: GuildEventDraft, previous?: GuildEvent): DomainResult<GuildEventInput> {
    const startsAt = zonedToIso(draft.date, draft.time)
    if (!startsAt) return fail('invalid', 'Bitte Datum und Uhrzeit für den Beginn angeben.')
    let endsAt: string | null = null
    if (draft.endTime) {
      const end = zonedToIso(draft.date, draft.endTime)
      if (!end) return fail('invalid', 'Bitte eine gültige Endzeit angeben.')
      // Ende vor dem Beginn = am nächsten Tag (z. B. 22:00 bis 01:00)
      endsAt = Date.parse(end) <= Date.parse(startsAt) ? new Date(Date.parse(end) + 86_400_000).toISOString() : end
    }
    const parsed = GuildEventInputSchema.safeParse({
      title: draft.title,
      description: draft.description,
      startsAt,
      endsAt,
      location: draft.location,
    })
    if (!parsed.success) return fail('invalid', parsed.error.issues[0]?.message ?? 'Bitte prüfe deine Eingaben.')
    return checkGuildEventInput(parsed.data, new Date(), previous)
  }

  async function save(draft: GuildEventDraft, id?: string): Promise<DomainResult<GuildEvent>> {
    const previous = id ? getEvent(id) ?? undefined : undefined
    if (id ? !previous || !canEdit(previous) : !canCreate.value) {
      return fail('not-allowed', id ? 'Dieses Event kannst du nicht bearbeiten.' : 'Nur Gildenmitglieder können Events eintragen.')
    }
    const input = parse(draft, previous)
    if (!input.ok) return input
    if (isDemo) {
      const now = new Date().toISOString()
      const entry: GuildEvent = {
        id: id ?? `demo-gevent-${crypto.randomUUID()}`,
        ...input.value,
        status: 'scheduled',
        createdBy: previous?.createdBy ?? viewer.value.memberId ?? 'demo',
        createdAt: previous?.createdAt ?? now,
        updatedAt: now,
      }
      saveDemo(entry)
      return ok(entry)
    }
    const result = await apiResult(() => (id
      ? $fetch<GuildEvent>(`/api/guild-events/${id}` as string, { method: 'PATCH', body: input.value })
      : $fetch<GuildEvent>('/api/guild-events', { method: 'POST', body: input.value })))
    if (result.ok) await refresh()
    return result
  }

  async function cancel(id: string, reason: string | null = null): Promise<DomainResult<GuildEvent>> {
    const existing = getEvent(id)
    if (!existing || !canEdit(existing)) return fail('not-allowed', 'Dieses Event kannst du nicht absagen.')
    const trimmed = reason?.trim().slice(0, 200) || null
    if (isDemo) {
      const entry: GuildEvent = { ...existing, status: 'cancelled', cancelReason: trimmed, updatedAt: new Date().toISOString() }
      saveDemo(entry)
      return ok(entry)
    }
    const result = await apiResult(() => $fetch<GuildEvent>(`/api/guild-events/${id}/cancel` as string, { method: 'POST', body: { reason: trimmed } }))
    if (result.ok) await refresh()
    return result
  }

  /** endgültig löschen (auch abgesagte) */
  async function remove(id: string): Promise<DomainResult<null>> {
    const existing = getEvent(id)
    if (!existing || !canDelete(existing)) return fail('not-allowed', 'Dieses Event kannst du nicht löschen.')
    if (isDemo) {
      deleted.value = [...deleted.value, id]
      return ok(null)
    }
    const result = await apiResult(() => $fetch<null>(`/api/guild-events/${id}` as string, { method: 'DELETE' }))
    if (!result.ok) return result
    await refresh()
    return ok(null)
  }

  return { events, status, refresh, getEvent, canCreate, canEdit, canDelete, save, cancel, remove }
}
