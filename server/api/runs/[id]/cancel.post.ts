import { cancelRun } from '#shared/domain/runs'
import { CancelInputSchema } from '#shared/schemas/groups'

/** Gruppe absagen – Organisation oder Admin, optional mit Grund. Die Gruppe bleibt als „abgesagt“ sichtbar. */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const run = await loadRunForWrite(event)
  assertPermission(viewer, 'runs:cancel', { organizerId: run.organizerId })
  const { reason } = await readValidatedBody(event, body => CancelInputSchema.parse(body ?? {}))
  const check = cancelRun(run, new Date(), reason)
  if (!check.ok) rejectWith(check.error, 409)
  const cancelled = await persist(() => writers.groups.cancel(run.id, reason))
  await notifyRunChange(run, cancelled, viewer.memberId)
  return cancelled
})
