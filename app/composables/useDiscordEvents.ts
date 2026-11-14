import { fail, ok, type DomainResult } from '#shared/domain/result'
import type { DiscordEvent } from '#shared/types'

/** Demo: auf der Seite abgesagte Discord-Events (ID → Grund), nur bis zum Neuladen */
const useDemoCancelled = () => useState<Record<string, string | null>>('demo-discord-cancelled', () => ({}))

/**
 * Discord-Events für den Kalender (aktuelle und vergangene, mit VOD-Link) und das Absagen
 * auf der Webseite durch Admins – z. B. wenn ein Stream ausfällt, das Event in Discord aber bleibt.
 */
export function useDiscordEvents() {
  const { isDemo } = useSiteConfig()
  const { can } = useViewer()
  const demoCancelled = useDemoCancelled()
  const { data, status, refresh } = useFetch<DiscordEvent[]>('/api/events/discord', { key: 'discord-events', default: () => [] })

  const events = computed<DiscordEvent[]>(() => (data.value ?? []).map((event) => {
    if (!isDemo || !(event.id in demoCancelled.value)) return event
    return { ...event, status: 'cancelled', siteCancelled: true, cancelReason: demoCancelled.value[event.id] ?? null, vodUrl: null }
  }))

  const canModerate = computed(() => can('events:moderate'))

  async function cancel(id: string, reason: string | null = null): Promise<DomainResult<null>> {
    if (!canModerate.value) return fail('not-allowed', 'Nur Admins können Discord-Events absagen.')
    const trimmed = reason?.trim().slice(0, 200) || null
    if (isDemo) {
      demoCancelled.value = { ...demoCancelled.value, [id]: trimmed }
      return ok(null)
    }
    const result = await apiResult(() => $fetch<null>(`/api/events/discord/${id}/cancel` as string, { method: 'POST', body: { reason: trimmed } }))
    if (result.ok) await refresh()
    return result
  }

  async function restore(id: string): Promise<DomainResult<null>> {
    if (!canModerate.value) return fail('not-allowed', 'Nur Admins können Absagen zurücknehmen.')
    if (isDemo) {
      const { [id]: _removed, ...rest } = demoCancelled.value
      demoCancelled.value = rest
      return ok(null)
    }
    const result = await apiResult(() => $fetch<null>(`/api/events/discord/${id}/restore` as string, { method: 'POST' }))
    if (result.ok) await refresh()
    return result
  }

  return { events, status, refresh, canModerate, cancel, restore }
}
