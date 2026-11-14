/** Absage eines Discord-Events auf der Webseite zurücknehmen (nur Admins) */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await getViewer(event)
  assertPermission(viewer, 'events:moderate')
  const target = await findDiscordEvent(getRouterParam(event, 'id'))
  const archive = useDiscordEventArchive()
  if (!archive) throw createError({ statusCode: 503, statusMessage: 'Ohne Datenbank kann nichts gespeichert werden.' })
  await persist(() => archive.setSiteCancelled(target, false))
  setResponseStatus(event, 204)
  return null
})
