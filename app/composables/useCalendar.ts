import { instances } from '#shared/data/dungeons'
import { mergeEvents } from '#shared/domain/events'
import type { CalendarEvent, DiscordEvent } from '#shared/types'

export type CalendarTypeFilter = 'all' | CalendarEvent['type']

/**
 * Kalender aus Discord-Events, Webseiten-Runs und Gilden-Events – inklusive lokaler Demo-Änderungen,
 * zusammengeführt mit derselben Logik wie auf dem Server (stabile IDs, keine Duplikate).
 */
export function useCalendar() {
  const { runs, memberById, status: runsStatus, refresh: refreshRuns } = useRuns()
  const { events: guildEvents, refresh: refreshGuildEvents } = useGuildEvents()
  const { data: discordEvents, status: discordStatus, refresh: refreshDiscord } = useFetch<DiscordEvent[]>('/api/events/discord', {
    key: 'discord-events',
    default: () => [],
  })

  const events = computed(() => {
    const organizerNames = new Map([...memberById.value.entries()].map(([id, member]) => [id, member.displayName]))
    return mergeEvents({
      discordEvents: discordEvents.value ?? [],
      runs: runs.value,
      dungeons: instances,
      guildEvents: guildEvents.value,
      organizerNames,
    })
  })

  const status = computed(() => (runsStatus.value === 'error' || discordStatus.value === 'error' ? 'error' : runsStatus.value === 'pending' || discordStatus.value === 'pending' ? 'pending' : 'success'))

  function filterEvents(
    list: CalendarEvent[],
    options: { type?: CalendarTypeFilter, includeCancelled?: boolean, upcomingOnly?: boolean, now?: Date },
  ) {
    const now = (options.now ?? new Date()).getTime()
    return list.filter((event) => {
      if (options.type && options.type !== 'all' && event.type !== options.type) return false
      if (!options.includeCancelled && event.status === 'cancelled') return false
      if (options.upcomingOnly && (Date.parse(event.startsAt) < now || event.status === 'completed')) return false
      return true
    })
  }

  async function refresh() {
    await Promise.all([refreshRuns(), refreshDiscord(), refreshGuildEvents()])
  }

  return { events, status, refresh, filterEvents }
}
