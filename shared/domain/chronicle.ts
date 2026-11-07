import type { GuildMilestone } from '../schemas/chronicle'

/** Datum für Sortierung und Anzeige: echtes Ereignisdatum, sonst Erkennungsdatum */
export function milestoneDate(milestone: GuildMilestone): string {
  return milestone.occurredAt ?? milestone.detectedAt ?? '1970-01-01'
}

const sourceRank: Record<GuildMilestone['source'], number> = { 'manual': 0, 'blizzard-api': 1, 'addon': 2 }

/**
 * Alle Quellen zu einer Chronik zusammenführen:
 * - gleicher `dedupeKey` oder gleiche `id` = derselbe Meilenstein; manuell schlägt API schlägt Addon
 *   (manuelle Korrekturen werden nie von Synchronisierungen überschrieben)
 * - neueste oben; bei gleichem Datum Hervorgehobene zuerst
 */
export function mergeMilestones(...sources: readonly (readonly GuildMilestone[])[]): GuildMilestone[] {
  const byKey = new Map<string, GuildMilestone>()
  for (const milestone of sources.flat()) {
    const key = milestone.dedupeKey ?? `id:${milestone.id}`
    const current = byKey.get(key)
    if (!current || sourceRank[milestone.source] < sourceRank[current.source]) byKey.set(key, milestone)
  }
  const unique = new Map([...byKey.values()].map(milestone => [milestone.id, milestone]))
  return [...unique.values()].sort((a, b) =>
    milestoneDate(b).localeCompare(milestoneDate(a))
    || Number(Boolean(b.highlight)) - Number(Boolean(a.highlight))
    || a.id.localeCompare(b.id))
}

/** Momentaufnahme der Gilde (aus API oder Addon) für die automatische Erkennung */
export interface GuildSnapshot {
  memberCount: number
  characters: readonly { id: string, name?: string, level: number, professionSkills: readonly number[] }[]
}

export const MEMBER_THRESHOLDS = [10, 25, 50, 100] as const
export const LEVEL_FIRSTS = [40, 50, 60] as const
export const PROFESSION_MAX = 300

/**
 * Neue automatische Meilensteine aus einer Momentaufnahme ableiten.
 * Liefert nur, was noch nicht existiert (per `dedupeKey`), und setzt KEIN erfundenes Ereignisdatum:
 * Die API kennt nur den aktuellen Stand – deshalb `occurredAt: null` und `detectedAt` = jetzt.
 * Erreichte Meilensteine bleiben erhalten, auch wenn die Mitgliederzahl später sinkt (es wird nie gelöscht).
 */
export function detectMilestones(
  snapshot: GuildSnapshot,
  existing: readonly GuildMilestone[],
  options: { now: Date, source?: GuildMilestone['source'] },
): GuildMilestone[] {
  const known = new Set(existing.map(milestone => milestone.dedupeKey).filter(Boolean))
  const detectedAt = options.now.toISOString()
  const source = options.source ?? 'blizzard-api'
  const found: GuildMilestone[] = []
  const add = (milestone: Omit<GuildMilestone, 'source' | 'occurredAt' | 'detectedAt'> & { dedupeKey: string }) => {
    if (!known.has(milestone.dedupeKey)) found.push({ ...milestone, source, occurredAt: null, detectedAt })
  }

  for (const threshold of MEMBER_THRESHOLDS) {
    if (snapshot.memberCount >= threshold) {
      add({ id: `members-${threshold}`, type: 'members.threshold', dedupeKey: `members.threshold:${threshold}`, title: `${threshold} Mitglieder erreicht`, category: 'community', icon: 'users', metadata: { threshold } })
    }
  }
  for (const level of LEVEL_FIRSTS) {
    const first = snapshot.characters.find(character => character.level >= level)
    if (first) {
      add({ id: `first-level-${level}`, type: 'level.first', dedupeKey: `level.first:${level}`, title: `Erster Charakter auf Stufe ${level}`, ...(first.name ? { description: `Geschafft hat es ${first.name}.` } : {}), category: 'achievement', icon: 'star', characterIds: [first.id], highlight: level === 60, metadata: { level } })
    }
  }
  const crafter = snapshot.characters.find(character => character.professionSkills.some(skill => skill >= PROFESSION_MAX))
  if (crafter) {
    add({ id: 'first-profession-300', type: 'profession.first-max', dedupeKey: `profession.first-max:${PROFESSION_MAX}`, title: 'Erster Beruf auf Skill 300', category: 'achievement', icon: 'sparkle', characterIds: [crafter.id] })
  }
  return found
}
