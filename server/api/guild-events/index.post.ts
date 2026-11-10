/** Gilden-Event eintragen (alle Gildenmitglieder) */
export default defineEventHandler(async (event) => {
  const { viewer, store } = await beginGuildEventWrite(event)
  assertPermission(viewer, 'events:create')
  const input = await readGuildEventInput(event)
  const created = await persist(() => store.create(viewer.memberId!, input))
  setResponseStatus(event, 201)
  return created
})
