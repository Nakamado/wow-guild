import { computeGuildStats } from '#shared/domain/guild'

/** Öffentliche Gildeninfos und aggregierte Statistiken (keine personenbezogenen Daten). */
export default defineEventHandler(async () => {
  const providers = useProviders()
  const [info, members, characters, runs] = await Promise.all([
    providers.guild.getInfo(),
    providers.members.listGuildMembers(),
    providers.characters.list(),
    providers.groups.list(),
  ])
  return { info, stats: computeGuildStats(members, characters, runs, new Date()) }
})
