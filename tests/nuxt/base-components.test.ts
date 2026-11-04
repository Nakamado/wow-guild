import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import BaseButton from '~/components/base/BaseButton.vue'
import EmptyState from '~/components/base/EmptyState.vue'
import ErrorState from '~/components/base/ErrorState.vue'
import LoadingSkeleton from '~/components/base/LoadingSkeleton.vue'

describe('BaseButton', () => {
  it('rendert ohne Ziel einen <button> mit type="button"', async () => {
    const wrapper = await mountSuspended(BaseButton, { slots: { default: () => 'Klick' } })
    const button = wrapper.find('button')
    expect(button.exists()).toBe(true)
    expect(button.attributes('type')).toBe('button')
    expect(button.classes()).toContain('base-button--primary')
  })

  it('rendert mit `to` einen internen Link', async () => {
    const wrapper = await mountSuspended(BaseButton, {
      props: { to: '/dungeons' },
      slots: { default: () => 'Dungeons' },
    })
    const link = wrapper.find('a')
    expect(link.attributes('href')).toBe('/dungeons')
    expect(link.attributes('target')).toBeUndefined()
  })

  it('öffnet externe Links sicher in neuem Tab', async () => {
    const wrapper = await mountSuspended(BaseButton, {
      props: { href: 'https://discord.gg/example', external: true },
      slots: { default: () => 'Discord' },
    })
    const link = wrapper.find('a')
    expect(link.attributes('target')).toBe('_blank')
    expect(link.attributes('rel')).toContain('noopener')
    expect(link.text()).toContain('öffnet in neuem Tab')
  })

  it('ist im Ladezustand deaktiviert und als busy markiert', async () => {
    const wrapper = await mountSuspended(BaseButton, { props: { loading: true } })
    const button = wrapper.find('button')
    expect(button.attributes('disabled')).toBeDefined()
    expect(button.attributes('aria-busy')).toBe('true')
  })
})

describe('Zustandskomponenten', () => {
  it('EmptyState nutzt die gewünschte Überschriftenebene', async () => {
    const wrapper = await mountSuspended(EmptyState, {
      props: { title: 'Noch keine Gruppen', headingLevel: 2 },
    })
    expect(wrapper.find('h2').text()).toBe('Noch keine Gruppen')
  })

  it('ErrorState ist eine Live-Region und meldet Retry', async () => {
    const wrapper = await mountSuspended(ErrorState)
    expect(wrapper.find('[role="alert"]').exists()).toBe(true)
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted('retry')).toHaveLength(1)
  })

  it('LoadingSkeleton ist für Screenreader beschriftet', async () => {
    const wrapper = await mountSuspended(LoadingSkeleton, { props: { label: 'Lade Dungeons …' } })
    expect(wrapper.find('[role="status"]').text()).toContain('Lade Dungeons …')
  })
})
