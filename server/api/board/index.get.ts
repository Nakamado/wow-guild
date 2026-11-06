import { createDemoBoardNotes } from '../../../data/demo/board'
import { activeBoardNotes } from '#shared/domain/board'

/** Schwarzes Brett – nur für Gildenmitglieder. Abgelaufene Aushänge werden nicht ausgeliefert. */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'board:view')
  const now = new Date()
  if (useRuntimeConfig(event).public.demoMode) return activeBoardNotes(createDemoBoardNotes(now), now)
  const store = useBoardStore()
  return store ? activeBoardNotes(await persist(() => store.list()), now) : []
})
