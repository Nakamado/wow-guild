import { can } from '#shared/domain/permissions'

/**
 * Adminbereich – Übersicht: wenige Kennzahlen, für den Hauptadmin zusätzlich die letzten Änderungen.
 * Keine Nutzungsstatistiken.
 */
export default defineEventHandler(async (event) => {
  const viewer = await requirePermission(event, 'admin:area')
  const accounts = requireStore(useAccountStore())
  const since = new Date(Date.now() - 7 * 86_400_000)
  const counts = await persist(() => accounts.counts(since))
  const recent = can(viewer, 'activity:view')
    ? await persist(() => requireStore(useActivityStore()).list({ limit: 8 }))
    : null
  const names = recent ? Object.fromEntries((await persist(() => accounts.listForAdmin())).map(member => [member.id, member.displayName])) : {}
  return { counts, recent, names }
})
