import { z } from 'zod'
import { can } from '#shared/domain/permissions'
import { mergeEvents } from '#shared/domain/events'
import { createDemoGuildEvents } from '../../data/demo/guild-events'

const QuerySchema = z.object({
  /** nur kommende, nicht abgeschlossene Events */
  upcoming: z.enum(['0', '1']).default('0'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/** Kalender aus Discord-Events, Webseiten-Runs und Gilden-Events (stabile IDs, ohne Duplikate). */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const viewer = await getViewer(event)
  const providers = useProviders()

  const guildEventStore = useGuildEventStore()
  const [discordEvents, runs, dungeons, members, guildEvents] = await Promise.all([
    listCalendarDiscordEvents(),
    providers.groups.list(),
    providers.dungeons.list(),
    providers.members.listGuildMembers(),
    useRuntimeConfig(event).public.demoMode
      ? createDemoGuildEvents(new Date())
      : guildEventStore ? guildEventStore.list().catch(() => []) : [],
  ])

  // Namen von Organisatoren sind Mitgliederdaten → nur für Gildenmitglieder
  const showNames = can(viewer, 'members:view')
  const organizerNames = showNames ? new Map(members.map(member => [member.id, member.displayName])) : undefined

  const now = Date.now()
  const merged = mergeEvents({ discordEvents, runs, dungeons, guildEvents, organizerNames })
    .map(entry => (showNames ? entry : { ...entry, organizerName: null }))
  const upcoming = merged.filter(entry => Date.parse(entry.startsAt) >= now && entry.status !== 'completed').slice(0, query.limit)
  if (query.upcoming === '1') return upcoming
  // Alle: kommende haben Vorrang, der Rest wird mit den jüngsten vergangenen aufgefüllt
  // (das Archiv vergangener Discord-Events wächst, kommende dürfen dadurch nie herausfallen)
  const upcomingIds = new Set(upcoming.map(entry => entry.id))
  const past = merged.filter(entry => !upcomingIds.has(entry.id))
  return [...past.slice(Math.max(0, past.length - (query.limit - upcoming.length))), ...upcoming]
})
