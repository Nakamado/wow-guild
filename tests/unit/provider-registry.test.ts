import { describe, expect, it } from 'vitest'
import { createProviders, resolveProviderModes, type ProviderConfig } from '../../server/providers/registry'
import { filterClips } from '../../server/providers/demo'
import { createDemoDataset } from '../../data/demo'
import type { DiscordEventProvider } from '../../server/providers/types'

const baseConfig: ProviderConfig = {
  demoMode: true,
  guild: { name: 'Testgilde', realm: 'Test', faction: 'alliance', discordInvite: 'https://discord.gg/test', description: '' },
  discord: { botToken: '', guildId: '723275162971275335', memberRoleId: '', adminRoleId: '' },
  twitch: { clientId: '', clientSecret: '', broadcasterId: '114422810', channel: 'miinyu' },
  supabase: { url: '', serviceRoleKey: '' },
}

const liveConfig: ProviderConfig = {
  ...baseConfig,
  demoMode: false,
  discord: { botToken: 'secret-bot', guildId: '723275162971275335', memberRoleId: 'role', adminRoleId: 'admin' },
  twitch: { ...baseConfig.twitch, clientId: 'id', clientSecret: 'secret' },
  supabase: { url: 'https://example.supabase.co', serviceRoleKey: 'service' },
}

describe('resolveProviderModes', () => {
  it('nutzt im Demo-Modus überall Demo-Daten (statische Daten bleiben statisch)', () => {
    const modes = resolveProviderModes(baseConfig, ['members', 'twitch'])
    expect(modes.dungeons.mode).toBe('static')
    expect(modes.guild.mode).toBe('static')
    expect(modes.members).toMatchObject({ mode: 'demo', reason: 'demo-mode' })
    expect(modes.twitch).toMatchObject({ mode: 'demo', reason: 'demo-mode' })
  })

  it('fällt nur für Provider mit fehlenden Zugangsdaten auf Demo zurück', () => {
    const config: ProviderConfig = { ...liveConfig, twitch: { ...liveConfig.twitch, clientSecret: '' } }
    const modes = resolveProviderModes(config, ['members', 'discordEvents', 'twitch', 'characters', 'groups'])
    expect(modes.twitch).toEqual({ mode: 'demo', reason: 'missing-credentials', missing: ['NUXT_TWITCH_CLIENT_SECRET'] })
    expect(modes.members.mode).toBe('live')
    expect(modes.groups.mode).toBe('live')
  })

  it('verträgt Zahlen aus Umgebungsvariablen (Nitro wandelt kurze Zahlen um)', () => {
    const config = { ...liveConfig, twitch: { ...liveConfig.twitch, broadcasterId: 114422810 as unknown as string } }
    expect(resolveProviderModes(config, ['twitch']).twitch.mode).toBe('live')
  })

  it('fällt auf Demo zurück, solange kein Live-Provider implementiert ist', () => {
    const modes = resolveProviderModes(liveConfig, [])
    expect(modes.members).toMatchObject({ mode: 'demo', reason: 'not-implemented' })
  })

  it('gibt nur Variablennamen aus, nie geheime Werte', () => {
    const serialized = JSON.stringify(resolveProviderModes({ ...liveConfig, supabase: { url: '', serviceRoleKey: 'service' } }, []))
    expect(serialized).not.toContain('secret-bot')
    expect(serialized).not.toContain('service"')
    expect(serialized).toContain('NUXT_SUPABASE_URL')
  })
})

describe('createProviders', () => {
  it('liefert ohne Zugangsdaten einen vollständig nutzbaren Demo-Satz', async () => {
    const { providers } = createProviders(baseConfig, { now: new Date('2026-11-04T12:00:00Z') })
    expect((await providers.dungeons.list()).length).toBeGreaterThan(30)
    expect((await providers.guild.getInfo()).name).toBe('Testgilde')
    const members = await providers.members.listGuildMembers()
    expect(members.every(m => m.isGuildMember)).toBe(true)
    expect(await providers.groups.get('demo-run-01')).not.toBeNull()
    expect((await providers.twitch.getStreamStatus()).isLive).toBe(false)
  })

  it('setzt Live-Provider ein, wenn konfiguriert und vorhanden', async () => {
    const live: DiscordEventProvider = { listScheduledEvents: async () => [] }
    const { providers, modes } = createProviders(liveConfig, { liveFactories: { discordEvents: () => live } })
    expect(modes.discordEvents.mode).toBe('live')
    expect(providers.discordEvents).toBe(live)
    expect(modes.members.mode).toBe('demo')
  })

  it('gibt Kopien zurück, damit der Demo-Datensatz unverändert bleibt', async () => {
    const { providers } = createProviders(baseConfig)
    const [first] = await providers.members.listGuildMembers()
    first!.displayName = 'verändert'
    const [again] = await providers.members.listGuildMembers()
    expect(again!.displayName).not.toBe('verändert')
  })
})

describe('Demo-Clips', () => {
  const now = new Date('2026-11-04T12:00:00Z')
  const { clips } = createDemoDataset(now)

  it('filtert nach Zeitraum und sortiert nach Datum oder Beliebtheit', () => {
    const recent = filterClips(clips, { period: '7d', sort: 'recent', limit: 10 }, now)
    expect(recent.every(c => Date.parse(c.createdAt) >= now.getTime() - 7 * 86_400_000)).toBe(true)
    expect(recent.map(c => c.createdAt)).toEqual([...recent.map(c => c.createdAt)].sort().reverse())

    const popular = filterClips(clips, { period: 'all', sort: 'popular', limit: 3 }, now)
    expect(popular).toHaveLength(3)
    expect(popular[0]!.viewCount).toBeGreaterThanOrEqual(popular[1]!.viewCount)
  })
})
