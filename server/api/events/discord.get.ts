import { can } from '#shared/domain/permissions'

/** Discord Scheduled Events (führende Quelle: Discord). Veranstalter-Namen nur für Mitglieder. */
export default defineEventHandler(async (event) => {
  const events = await useProviders().discordEvents.listScheduledEvents()
  if (can(getViewer(event), 'members:view')) return events
  return events.map(entry => ({ ...entry, organizerName: null }))
})
