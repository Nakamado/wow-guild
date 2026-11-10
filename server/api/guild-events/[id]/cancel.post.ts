import { CancelInputSchema } from '#shared/schemas/groups'

/** Gilden-Event absagen (wer es eingetragen hat, oder Admins), optional mit Grund – bleibt als „abgesagt“ sichtbar */
export default defineEventHandler(async (event) => {
  const { viewer, store } = await beginGuildEventWrite(event)
  const existing = await loadEditableGuildEvent(event, store, viewer)
  const { reason } = await readValidatedBody(event, body => CancelInputSchema.parse(body ?? {}))
  return persist(() => store.cancel(existing.id, reason))
})
