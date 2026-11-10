/**
 * Gruppe endgültig löschen – Organisation oder Admin. Für Fehleinträge oder Gruppen, die sich
 * erledigt haben; wer nur absagen will (krank, zu wenig Anmeldungen), nutzt `cancel`.
 */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const run = await loadRunForWrite(event)
  assertPermission(viewer, 'runs:cancel', { organizerId: run.organizerId })
  await persist(() => writers.groups.remove(run.id))
  await Promise.all([notifyRunChange(run, null, viewer.memberId), removeRunAnnouncement(run)])
  setResponseStatus(event, 204)
  return null
})
