import { describe, expect, it } from 'vitest'
import { characterFromGame } from '../../shared/domain/characters'
import { parseCharacterProfile } from '../../server/providers/blizzard/progress'

describe('Charakter aus Blizzard-Daten', () => {
  it('liest Stufe, Klasse, Volk und Fraktion aus dem Profil', () => {
    expect(parseCharacterProfile({
      name: 'Nak', surname: 'Totembart', level: 19,
      character_class: { id: 7 }, race: { id: 3 }, faction: { type: 'ALLIANCE' },
    }, 'Nak Totembart')).toEqual({ name: 'Nak Totembart', level: 19, classId: 'shaman', raceId: 'dwarf', faction: 'alliance' })
  })

  it('ordnet neue Völker über den Namen zu und meldet Unbekanntes als null', () => {
    expect(parseCharacterProfile({ level: 5, character_class: { id: 99 }, race: { id: 77, name: 'Himmelsgeborene' } }, 'Eins Zwei'))
      .toMatchObject({ classId: null, raceId: 'skyborne', faction: null, name: 'Eins Zwei' })
    expect(parseCharacterProfile({ name: 'Ohne' }, 'X Y')).toBeNull()
  })

  it('übernimmt nur Rollen, die die Klasse kann – sonst alle Rollen der Klasse', () => {
    const profile = { level: 30, classId: 'mage', raceId: 'gnome', faction: 'alliance' as const }
    expect(characterFromGame({ name: 'Eins Zwei', roles: ['tank', 'dps'] }, profile, 'alliance'))
      .toEqual({ ok: true, value: { name: 'Eins Zwei', faction: 'alliance', classId: 'mage', raceId: 'gnome', level: 30, roles: ['dps'] } })
    const warrior = characterFromGame({ name: 'Eins Zwei', roles: ['healer'] }, { ...profile, classId: 'warrior', raceId: 'human' }, 'alliance')
    expect(warrior.ok && warrior.value.roles).toEqual(['tank', 'dps'])
  })

  it('verlangt bei unbekannter Klasse oder unbekanntem Volk die eigene Eingabe', () => {
    expect(characterFromGame({ name: 'Eins Zwei', roles: ['dps'] }, { level: 10, classId: null, raceId: 'human', faction: null }, 'alliance'))
      .toMatchObject({ ok: false, error: { code: 'game-data-incomplete' } })
  })
})
