import { can } from '#shared/domain/permissions'

/** Weitere Gilden-Streamer. Die Zuordnung zu Mitgliedern sehen nur Gildenmitglieder. */
export default defineEventHandler(async (event) => {
  const streamers = await useProviders().twitch.listStreamers()
  const showMembers = can(getViewer(event), 'members:view')
  return streamers
    .map(streamer => (showMembers ? streamer : { ...streamer, memberId: null }))
    .sort((a, b) => Number(b.isLive) - Number(a.isLive) || a.displayName.localeCompare(b.displayName, 'de'))
})
