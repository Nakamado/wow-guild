import type { GuildMilestone } from '../shared/schemas/chronicle'

/**
 * Gilden-Chronik („Unsere Geschichte“) – manuell gepflegte Meilensteine.
 *
 * NEUEN MEILENSTEIN ERGÄNZEN: einfach unten in `manualMilestones` einen Eintrag anhängen.
 * - id: eindeutig, klein, mit Bindestrichen – am besten „JJJJ-MM-TT-kurztitel“
 * - occurredAt: Datum als „JJJJ-MM-TT“
 * - category: community | dungeon | raid | achievement | custom
 * - source: immer 'manual'
 * Die Reihenfolge in der Datei ist egal – die Chronik sortiert selbst (neueste oben).
 * Bestehende Einträge nicht ändern; ein Test prüft Format und eindeutige IDs.
 *
 * Beispiel:
 *   {
 *     id: '2026-11-15-erster-raid',
 *     type: 'raid.first',
 *     title: 'Unser erster gemeinsamer Raid',
 *     description: 'Zum ersten Mal zogen wir gemeinsam in eine Raidinstanz.',
 *     category: 'raid',
 *     source: 'manual',
 *     occurredAt: '2026-11-15',
 *   },
 */
export const manualMilestones: GuildMilestone[] = [
]

/**
 * Gründungstag der Gilde, falls die Blizzard-API kein Gründungsdatum liefert.
 * Automatisch kommen außerdem dazu: Mitgliederzahlen (10, 25, 50, 100) und die ersten Charaktere
 * auf Stufe 40, 50 und 60 – erkannt über die Gildenliste der Blizzard-API.
 */
export const guildFoundedOn = '2026-11-06'
