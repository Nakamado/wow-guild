import type { GameClass } from '../types'

type ClassInput = Omit<GameClass, 'sourceIds'>

/**
 * Spielbare Klassen in WoW: Forever.
 * Rollen = übliche Gruppenrollen der Community; Paladine erhalten in Forever eine
 * Spott-Fähigkeit und werden daher auch als Tank geführt. Bei Bedarf hier anpassen.
 * Die Farbe kommt aus `--color-class-<id>` (app/assets/scss/tokens/_class-colors.scss).
 */
const classInputs: ClassInput[] = [
  { id: 'warrior', name: 'Krieger', nameEn: 'Warrior', roles: ['tank', 'dps'] },
  { id: 'paladin', name: 'Paladin', nameEn: 'Paladin', roles: ['tank', 'healer', 'dps'] },
  { id: 'hunter', name: 'Jäger', nameEn: 'Hunter', roles: ['dps'] },
  { id: 'rogue', name: 'Schurke', nameEn: 'Rogue', roles: ['dps'] },
  { id: 'priest', name: 'Priester', nameEn: 'Priest', roles: ['healer', 'dps'] },
  { id: 'shaman', name: 'Schamane', nameEn: 'Shaman', roles: ['healer', 'dps'] },
  { id: 'mage', name: 'Magier', nameEn: 'Mage', roles: ['dps'] },
  { id: 'warlock', name: 'Hexenmeister', nameEn: 'Warlock', roles: ['dps'] },
  { id: 'druid', name: 'Druide', nameEn: 'Druid', roles: ['tank', 'healer', 'dps'] },
]

export const gameClasses: readonly GameClass[] = classInputs.map(gameClass => ({
  ...gameClass,
  sourceIds: ['warcrafttavern-forever-race-class', 'community-role-convention'],
}))

export function findClass(id: string, catalog: readonly GameClass[] = gameClasses): GameClass | undefined {
  return catalog.find(gameClass => gameClass.id === id)
}
