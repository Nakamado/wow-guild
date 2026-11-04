import type { CharacterProvider } from '../types'

/**
 * Platzhalter für einen späteren Blizzard-Provider (Charakterdaten aus der Armory).
 *
 * Stand 11/2026 ist NICHT belegt, dass die Blizzard Game Data / Profile APIs
 * WoW: Forever unterstützen (Namespace, Realms, Endpunkte). Deshalb gibt es hier
 * bewusst keine erfundenen URLs. Der Provider ist nicht in der Registry eingetragen –
 * Charaktere pflegen Mitglieder selbst (Supabase).
 *
 * Wenn Blizzard eine Forever-API veröffentlicht:
 * 1. Endpunkte und Namespace aus der offiziellen Doku übernehmen (Quelle in docs/PLAN.md)
 * 2. Rohantworten mit Zod validieren und auf `Character` normalisieren (source: 'blizzard')
 * 3. Als ergänzende Quelle zu den selbst gepflegten Charakteren registrieren
 */
export function createBlizzardCharacterProvider(): CharacterProvider {
  const unsupported = (): never => {
    throw new Error('Blizzard-API für WoW: Forever ist nicht verfügbar (Stub).')
  }
  return {
    list: async () => unsupported(),
    listByMember: async () => unsupported(),
    get: async () => unsupported(),
  }
}
