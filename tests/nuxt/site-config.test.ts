import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import DemoBanner from '~/components/layout/DemoBanner.vue'

describe('useSiteConfig', () => {
  it('liefert konfigurierbare Gildenwerte mit lesbarer Fraktion', () => {
    const { guild, twitch, isDemo } = useSiteConfig()
    expect(guild.factionLabel).toBe('Allianz')
    expect(guild.discordInvite).toMatch(/^https:\/\/discord\.gg\//)
    expect(twitch.url).toBe('https://www.twitch.tv/miinyu')
    expect(isDemo).toBe(true)
  })
})

describe('DemoBanner', () => {
  it('ist im Demo-Modus sichtbar und lässt sich einklappen', async () => {
    const wrapper = await mountSuspended(DemoBanner)
    expect(wrapper.text()).toContain('Demo')
    const toggle = wrapper.find('button')
    expect(toggle.attributes('aria-expanded')).toBe('true')
    await toggle.trigger('click')
    expect(toggle.attributes('aria-expanded')).toBe('false')
  })
})
