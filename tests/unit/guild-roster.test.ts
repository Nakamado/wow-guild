import { describe, expect, it } from 'vitest'
import { guildRankLabel } from '../../content/guild-ranks'
import { parseGuildRoster } from '../../server/providers/blizzard/guild'
import { sortCharacterRows } from '../../shared/domain/character-table'
import type { Character } from '../../shared/types'

describe('Gildenliste (Blizzard)', () => {
  it('liest Mitglieder mit Slug, Stufe und Rang (Format wie bei MukiMuki)', () => {
    const body = {
      guild: { name: 'MukiMuki', slug: 'mukimuki', id: 181123 },
      members: [
        {
          character: {
            key: { href: 'https://eu.api.blizzard.com/profile/wow/character/minyu-souleater?namespace=profile-forever-eu' },
            name: 'Minyu', surname: 'Souleater', slug: 'minyu-souleater', id: 571535, level: 14,
            playable_class: { id: 11 }, playable_race: { id: 95 }, faction: { type: 'ALLIANCE' },
          },
          rank: 0,
        },
        { character: { name: 'Nak', surname: 'Totembart', level: 20 }, rank: 4 },
        { character: { name: 'Ohne' } },
        'kaputt',
      ],
    }
    expect(parseGuildRoster(body)).toEqual([
      { slug: 'minyu-souleater', name: 'Minyu Souleater', level: 14, rank: 0 },
      { slug: 'nak-totembart', name: 'Nak Totembart', level: 20, rank: 4 },
    ])
    expect(parseGuildRoster({ code: 404 })).toEqual([])
  })

  it('benennt Ränge über content/guild-ranks.ts', () => {
    expect(guildRankLabel(0)).toBe('Gildenmeister')
    expect(guildRankLabel(3)).toBe('Mitglied')
    expect(guildRankLabel(7)).toBe('Rang 7')
  })

  it('sortiert nach Gildenrang; Nicht-Mitglieder und Unbekannte am Ende', () => {
    const row = (name: string, guild: Character['guild']) => ({
      playerName: 'x',
      character: { id: name, memberId: 'm', name, realm: 'PvE', faction: 'alliance', classId: 'warrior', raceId: 'human', level: 10, roles: ['dps'], isMain: false, source: 'demo', updatedAt: '2026-11-07T00:00:00.000Z', professions: [], guild } as Character,
    })
    const rows = [row('A A', { inGuild: false, rank: null }), row('B B', { inGuild: true, rank: 3 }), row('C C', undefined), row('D D', { inGuild: true, rank: 0 })]
    expect(sortCharacterRows(rows, { key: 'rank', direction: 'asc' }).map(entry => entry.character.name)).toEqual(['D D', 'B B', 'A A', 'C C'])
    expect(sortCharacterRows(rows, { key: 'rank', direction: 'desc' }).map(entry => entry.character.name)).toEqual(['B B', 'D D', 'A A', 'C C'])
  })
})

describe('Gilden-Gründung und Charakterbilder (Blizzard)', () => {
  it('liest das Gründungsdatum und verwirft unplausible Werte', async () => {
    const { parseGuildCreatedAt } = await import('../../server/providers/blizzard/guild')
    expect(parseGuildCreatedAt({ name: 'MukiMuki', created_timestamp: Date.parse('2026-11-06T19:30:00Z') })).toBe('2026-11-06T19:30:00.000Z')
    expect(parseGuildCreatedAt({ name: 'MukiMuki' })).toBeNull()
    expect(parseGuildCreatedAt({ created_timestamp: 0 })).toBeNull()
    expect(parseGuildCreatedAt(null)).toBeNull()
  })

  it('übernimmt nur Bilder vom Blizzard-Render-Server', async () => {
    const { parseCharacterMedia } = await import('../../server/providers/blizzard/progress')
    const base = 'https://render.worldofwarcraft.com/forever-eu/character/x'
    expect(parseCharacterMedia({
      assets: [
        { key: 'avatar', value: `${base}-avatar.jpg` },
        { key: 'inset', value: `${base}-inset.jpg` },
        { key: 'main-raw', value: `${base}-main-raw.png` },
      ],
    })).toEqual({ avatarUrl: `${base}-avatar.jpg`, insetUrl: `${base}-inset.jpg`, mainUrl: `${base}-main-raw.png` })
    expect(parseCharacterMedia({ assets: [{ key: 'avatar', value: 'https://example.com/a.jpg' }] })).toBeNull()
    expect(parseCharacterMedia({ _links: {} })).toBeNull()
  })
})
