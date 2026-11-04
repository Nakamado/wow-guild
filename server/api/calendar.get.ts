import { z } from 'zod'
import { can } from '#shared/domain/permissions'
import { mergeEvents } from '#shared/domain/events'

const QuerySchema = z.object({
  /** nur kommende, nicht abgeschlossene Events */
  upcoming: z.enum(['0', '1']).default('0'),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

/** Kalender aus Discord-Events und Webseiten-Runs (stabile IDs, ohne Duplikate). */
export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, QuerySchema.parse)
  const viewer = getViewer(event)
  const providers = useProviders()

  const [discordEvents, runs, dungeons, members] = await Promise.all([
    providers.discordEvents.listScheduledEvents(),
    providers.groups.list(),
    providers.dungeons.list(),
    providers.members.listGuildMembers(),
  ])

  // Namen von Organisatoren sind Mitgliederdaten → nur für Gildenmitglieder
  const showNames = can(viewer, 'members:view')
  const organizerNames = showNames ? new Map(members.map(member => [member.id, member.displayName])) : undefined

  const now = Date.now()
  return mergeEvents({ discordEvents, runs, dungeons, organizerNames })
    .map(entry => (showNames ? entry : { ...entry, organizerName: null }))
    .filter(entry => query.upcoming === '0' || (Date.parse(entry.startsAt) >= now && entry.status !== 'completed'))
    .slice(0, query.limit)
})
