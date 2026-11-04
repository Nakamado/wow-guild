/** Mitgliederliste – nur für Gildenmitglieder (Datenschutz: keine öffentliche Discord-Liste). */
export default defineEventHandler(async (event) => {
  await requirePermission(event, 'members:view')
  return loadMembersWithCharacters()
})
