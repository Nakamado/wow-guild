/** Alle Runs (Dungeon- und Raidgruppen). Teilnehmer nur für Gildenmitglieder erkennbar. */
export default defineEventHandler(async (event) => {
  const viewer = getViewer(event)
  const runs = await useProviders().groups.list()
  return runs
    .map(run => redactRun(run, viewer))
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt))
})
