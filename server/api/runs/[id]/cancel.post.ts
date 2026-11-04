import { cancelRun } from '#shared/domain/runs'

/** Gruppe absagen – Organisation oder Admin. */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const run = await loadRunForWrite(event)
  assertPermission(viewer, 'runs:cancel', { organizerId: run.organizerId })
  const check = cancelRun(run, new Date())
  if (!check.ok) rejectWith(check.error, 409)
  return persist(() => writers.groups.cancel(run.id))
})
