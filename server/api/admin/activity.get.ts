import { z } from 'zod'

const QuerySchema = z.object({
  /** Einträge vor dieser ID (zum Nachladen älterer Einträge) */
  vor: z.coerce.number().int().positive().optional(),
})

/** Aktivitätsprotokoll – ausschließlich für den Hauptadmin */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'activity:view')
  const { vor } = await getValidatedQuery(event, QuerySchema.parse)
  const store = requireStore(useActivityStore())
  const limit = 50
  const [entries, members] = await Promise.all([
    persist(() => store.list({ limit: limit + 1, before: vor })),
    persist(() => requireStore(useAccountStore()).listForAdmin()),
  ])
  return {
    entries: entries.slice(0, limit),
    /** Anzeigenamen bestehender Konten (gelöschte erscheinen nur mit ID) */
    names: Object.fromEntries(members.map(member => [member.id, member.displayName])),
    hasMore: entries.length > limit,
    retentionDays: Number(useRuntimeConfig(event).retention.activityDays) || 90,
  }
})
