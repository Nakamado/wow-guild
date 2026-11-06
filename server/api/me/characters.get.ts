/** Eigene Charaktere des angemeldeten Gildenmitglieds (für Anmeldung und Filter). */
export default defineEventHandler(async (event) => {
  const viewer = await requirePermission(event, 'runs:join')
  if (!viewer.memberId) return []
  return sortCharacters(await withGameData(await useProviders().characters.listByMember(viewer.memberId)))
})
