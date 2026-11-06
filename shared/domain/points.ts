import type { PointsRules, ProgressEvent, ProgressType } from '../schemas/points'

/** Eindeutiger Schlüssel: dasselbe Ereignis aus API und Addon zählt nur einmal */
export const eventKey = (event: Pick<ProgressEvent, 'characterId' | 'type' | 'objectId'>) =>
  `${event.characterId}:${event.type}:${event.objectId}`

/** Wochenschlüssel nach Blizzard-Reset (z. B. Mittwoch 04:00 UTC) – Datum des Wochenbeginns */
export function weekKey(iso: string, reset: PointsRules['weekReset']): string {
  const date = new Date(iso)
  const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), reset.hourUtc))
  // zurück bis zum letzten Reset-Zeitpunkt
  while (start.getUTCDay() !== reset.weekday || start > date) start.setUTCDate(start.getUTCDate() - 1)
  return start.toISOString().slice(0, 10)
}

/** Ein gewertetes Ereignis: wie viele Punkte es tatsächlich gebracht hat */
export interface ScoredEvent {
  event: ProgressEvent
  granted: number
  /** wegen Wochenlimit nicht vergeben */
  capped: number
}

export interface ScoreBreakdown {
  total: number
  oneTime: number
  repeatable: number
  /** über dem Wochenlimit, gespeichert, aber mit 0 Punkten verbucht */
  capped: number
  byType: Partial<Record<ProgressType, number>>
  /** jedes gezählte Ereignis – Grundlage für die Aufschlüsselung „So kommen die Punkte zustande“ */
  entries: ScoredEvent[]
}

const emptyScore = (): ScoreBreakdown => ({ total: 0, oneTime: 0, repeatable: 0, capped: 0, byType: {}, entries: [] })

/**
 * Punkte für eine Menge von Ereignissen berechnen (eine Person bzw. ein Charakter).
 * - Duplikate (gleicher Schlüssel) zählen einmal
 * - wiederholbare Aktivität höchstens `weeklyRepeatableCap` pro Woche (chronologisch aufgefüllt)
 * - rückwirkende Ereignisse ohne Datum zählen nur, wenn sie einmalig sind
 */
export function scoreEvents(events: readonly ProgressEvent[], rules: PointsRules): ScoreBreakdown {
  const score = emptyScore()
  const unique = [...new Map(events.map(event => [eventKey(event), event])).values()]
    .sort((a, b) => (a.occurredAt ?? '').localeCompare(b.occurredAt ?? ''))
  const weekly = new Map<string, number>()

  for (const event of unique) {
    const value = rules.points[event.type] ?? 0
    if (!rules.repeatable.includes(event.type)) {
      score.oneTime += value
      score.byType[event.type] = (score.byType[event.type] ?? 0) + value
      score.entries.push({ event, granted: value, capped: 0 })
      continue
    }
    if (!event.occurredAt) continue // wiederholbar ohne Zeitpunkt: keiner Woche zuordenbar
    const week = weekKey(event.occurredAt, rules.weekReset)
    const used = weekly.get(week) ?? 0
    const granted = Math.max(0, Math.min(value, rules.weeklyRepeatableCap - used))
    weekly.set(week, used + granted)
    score.repeatable += granted
    score.capped += value - granted
    score.byType[event.type] = (score.byType[event.type] ?? 0) + granted
    score.entries.push({ event, granted, capped: value - granted })
  }
  score.total = score.oneTime + score.repeatable
  return score
}

export interface LeaderboardInput {
  memberId: string
  mainCharacterId: string | null
}

export interface LeaderboardRow {
  rank: number
  memberId: string
  points: number
  score: ScoreBreakdown
}

/**
 * Zwei Ranglisten:
 * - `total`: alle (verifizierten) Charaktere einer Person zusammen, Wochenlimit je Person
 * - `main`: nur der Hauptcharakter
 * Gleichstand = gleicher Rang (1, 2, 2, 4).
 */
export function buildLeaderboards(events: readonly ProgressEvent[], members: readonly LeaderboardInput[], rules: PointsRules) {
  const byMember = new Map<string, ProgressEvent[]>()
  for (const event of events) byMember.set(event.memberId, [...(byMember.get(event.memberId) ?? []), event])

  const rank = (rows: Omit<LeaderboardRow, 'rank'>[]): LeaderboardRow[] => {
    const sorted = rows.filter(row => row.points > 0).sort((a, b) => b.points - a.points || a.memberId.localeCompare(b.memberId))
    // Rang = 1 + Anzahl Personen mit mehr Punkten
    return sorted.map(row => ({ ...row, rank: 1 + sorted.filter(other => other.points > row.points).length }))
  }

  const total = rank(members.map((member) => {
    const score = scoreEvents(byMember.get(member.memberId) ?? [], rules)
    return { memberId: member.memberId, points: score.total, score }
  }))
  const main = rank(members.filter(member => member.mainCharacterId).map((member) => {
    const own = (byMember.get(member.memberId) ?? []).filter(event => event.characterId === member.mainCharacterId)
    const score = scoreEvents(own, rules)
    return { memberId: member.memberId, points: score.total, score }
  }))
  return { total, main }
}

/** Rückwirkende Ereignisse aus dem aktuellen Stand (Stufe, Berufe) – ohne erfundenes Datum */
export function retroactiveEvents(
  character: { memberId: string, characterId: string, level: number, professions?: readonly { id: string, skill: number }[] },
  rules: PointsRules,
): ProgressEvent[] {
  const events: ProgressEvent[] = []
  for (let level = 2; level <= character.level; level++) {
    events.push({ memberId: character.memberId, characterId: character.characterId, type: 'level', objectId: String(level), occurredAt: null })
  }
  for (const profession of character.professions ?? []) {
    for (const milestone of rules.professionMilestones.filter(value => profession.skill >= value)) {
      events.push({ memberId: character.memberId, characterId: character.characterId, type: 'profession-milestone', objectId: `${profession.id}:${milestone}`, occurredAt: null })
    }
  }
  return events
}

export interface ExplanationItem {
  label: string
  count: number
  points: number
}

export interface ExplanationLine {
  type: ProgressType
  count: number
  points: number
  /** Punkte, die das Wochenlimit abgeschnitten hat */
  capped: number
  items: ExplanationItem[]
}

/**
 * Punkte nachvollziehbar machen: je Typ Anzahl und Summe, darunter die einzelnen Posten
 * (gleiche Bezeichnung zusammengefasst, z. B. „Die Todesminen ×3“). Stufen werden als Spanne gezeigt.
 * `describe` liefert die Bezeichnung eines Ereignisses (Dungeon-Name, Beruf + Stufe …).
 */
export function explainScore(score: ScoreBreakdown, describe: (event: ProgressEvent) => string): ExplanationLine[] {
  const lines = new Map<ProgressType, ExplanationLine & { byLabel: Map<string, ExplanationItem> }>()
  for (const { event, granted, capped } of score.entries) {
    const line = lines.get(event.type) ?? { type: event.type, count: 0, points: 0, capped: 0, items: [], byLabel: new Map() }
    line.count += 1
    line.points += granted
    line.capped += capped
    if (event.type !== 'level') {
      const label = describe(event)
      const item = line.byLabel.get(label) ?? { label, count: 0, points: 0 }
      item.count += 1
      item.points += granted
      line.byLabel.set(label, item)
    }
    lines.set(event.type, line)
  }
  for (const line of lines.values()) {
    if (line.type === 'level') {
      const levels = score.entries.filter(entry => entry.event.type === 'level').map(entry => Number(entry.event.objectId)).sort((a, b) => a - b)
      const label = levels.length > 1 ? `Stufe ${levels[0]} bis ${levels.at(-1)}` : `Stufe ${levels[0]}`
      line.items = [{ label, count: levels.length, points: line.points }]
    }
    else {
      line.items = [...line.byLabel.values()].sort((a, b) => b.points - a.points || a.label.localeCompare(b.label, 'de', { numeric: true }))
    }
  }
  return [...lines.values()]
    .map(({ byLabel: _byLabel, ...line }) => line)
    .sort((a, b) => b.points - a.points)
}
