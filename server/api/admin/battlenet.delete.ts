/** Battle.net-Verknüpfung aus der Session entfernen. */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  await requirePermission(event, 'admin:tools')
  const session = await getUserSession(event)
  if (session.user && session.secure?.battlenet) {
    const { battlenet: _removed, ...secure } = session.secure
    await replaceUserSession(event, { ...session, secure })
  }
  return { ok: true }
})
