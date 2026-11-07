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
    expect(guildRankLabel(3)).toBe('Rang 3')
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
