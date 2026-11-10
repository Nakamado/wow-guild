/** Gilden-Event endgültig löschen (wer es eingetragen hat, oder Admins) – auch abgesagte */
export default defineEventHandler(async (event) => {
  const { viewer, store } = await beginGuildEventWrite(event)
  const existing = await loadEditableGuildEvent(event, store, viewer, { allowCancelled: true })
  await persist(() => store.remove(existing.id))
  await removeGuildEventAnnouncement(existing)
  setResponseStatus(event, 204)
  return null
})
