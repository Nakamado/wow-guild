import { MarkReadInputSchema } from '#shared/schemas/notifications'

/** Eigene Benachrichtigungen als gelesen markieren (bestimmte oder alle) */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await getViewer(event)
  assertPermission(viewer, 'runs:join')
  const { ids } = await readValidatedBody(event, body => MarkReadInputSchema.parse(body ?? {}))
  const store = useNotificationStore()
  if (store && viewer.memberId) await persist(() => store.markRead(viewer.memberId!, ids))
  setResponseStatus(event, 204)
  return null
})
