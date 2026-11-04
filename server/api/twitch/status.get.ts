import { createDemoStreamStatus } from '../../../data/demo/twitch'

/** Livestatus von Miinyu. Im Demo-Modus per Demo-Steuerung umschaltbar. */
export default defineEventHandler(async (event) => {
  const status = await useProviders().twitch.getStreamStatus()
  if (useProviderModes().twitch.mode === 'demo' && isDemoLiveSimulated(event)) {
    return createDemoStreamStatus(new Date(), status.channel, true)
  }
  return status
})
