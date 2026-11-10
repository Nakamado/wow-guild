import { createDemoGuildEvents } from '../../../data/demo/guild-events'
import { can } from '#shared/domain/permissions'

/**
 * Gilden-Events für den Kalender. Öffentlich wie der Kalender selbst –
 * wer ein Event eingetragen hat (`createdBy`), sehen nur Gildenmitglieder.
 */
export default defineEventHandler(async (event) => {
  const viewer = await getViewer(event)
  const events = useRuntimeConfig(event).public.demoMode
    ? createDemoGuildEvents(new Date())
    : await (async () => {
        const store = useGuildEventStore()
        return store ? persist(() => store.list()) : []
      })()
  return can(viewer, 'members:view') ? events : events.map(entry => ({ ...entry, createdBy: 'hidden' }))
})
