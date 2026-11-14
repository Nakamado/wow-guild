import { CancelInputSchema } from '#shared/schemas/groups'

/**
 * Discord-Event auf der Webseite als abgesagt markieren (nur Admins), z. B. wenn ein Stream
 * ausfällt, das Event in Discord aber stehen bleibt. Discord selbst wird nicht verändert.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await getViewer(event)
  assertPermission(viewer, 'events:moderate')
  const { reason } = await readValidatedBody(event, body => CancelInputSchema.parse(body ?? {}))
  const target = await findDiscordEvent(getRouterParam(event, 'id'))
  const archive = useDiscordEventArchive()
  if (!archive) throw createError({ statusCode: 503, statusMessage: 'Ohne Datenbank kann nichts gespeichert werden.' })
  await persist(() => archive.setSiteCancelled(target, true, reason))
  setResponseStatus(event, 204)
  return null
})
