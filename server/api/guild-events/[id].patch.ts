/** Gilden-Event bearbeiten (wer es eingetragen hat, oder Admins) */
export default defineEventHandler(async (event) => {
  const { viewer, store } = await beginGuildEventWrite(event)
  const existing = await loadEditableGuildEvent(event, store, viewer)
  const input = await readGuildEventInput(event, existing)
  const updated = await persist(() => store.update(existing.id, input))
  await syncGuildEventAnnouncement(updated)
  return updated
})
