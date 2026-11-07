/**
 * Namen der Gildenränge. Die Blizzard-API liefert nur die Nummer des Rangs (0 = Gildenmeister),
 * nicht den Namen aus dem Spiel – hier eintragen, wie die Ränge in MukiMuki heißen.
 * Nicht eingetragene Ränge erscheinen als „Rang 3“ usw.
 */
export const guildRankNames: Record<number, string> = {
  0: 'Gildenmeister',
}

export function guildRankLabel(rank: number): string {
  return guildRankNames[rank] ?? `Rang ${rank}`
}
