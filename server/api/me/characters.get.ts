/** Eigene Charaktere des angemeldeten Gildenmitglieds (für Anmeldung und Filter). */
export default defineEventHandler(async (event) => {
  const viewer = requirePermission(event, 'runs:join')
  if (!viewer.memberId) return []
  return sortCharacters(await useProviders().characters.listByMember(viewer.memberId))
})
