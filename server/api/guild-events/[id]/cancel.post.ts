/** Gilden-Event absagen (wer es eingetragen hat, oder Admins) – bleibt als „abgesagt“ sichtbar */
export default defineEventHandler(async (event) => {
  const { viewer, store } = await beginGuildEventWrite(event)
  const existing = await loadEditableGuildEvent(event, store, viewer)
  const cancelled = await persist(() => store.cancel(existing.id))
  return cancelled
})
