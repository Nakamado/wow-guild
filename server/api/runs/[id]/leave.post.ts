/** Abmelden; bei freiem Platz rückt die erste Person derselben Rolle nach. */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  const run = await loadRunForWrite(event)
  const promoted = await persist(() => writers.groups.leave(run.id, viewer.memberId))
  const updated = await useProviders().groups.get(run.id)
  return { promoted, run: updated && redactRun(updated, viewer) }
})
