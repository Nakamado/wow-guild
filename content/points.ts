import type { PointsRules } from '../shared/schemas/points'

/**
 * Punktesystem (vorläufig, Stand 06.11.2026). Alle Werte und Limits hier ändern –
 * dann `version` erhöhen, damit klar ist, nach welchen Regeln gerechnet wurde.
 * Details und Entscheidungen: docs/ADDON-PLAN.md, Abschnitt 7.
 */
export const pointsRules: PointsRules = {
  version: 1,
  points: {
    'level': 100,
    'dungeon-first': 100,
    'dungeon-complete': 10,
    'dungeon-quest': 150,
    'dungeon-boss': 2,
    'raid-first': 100,
    'raid-boss': 20,
    'profession-milestone': 200,
  },
  repeatable: ['dungeon-complete', 'dungeon-boss', 'raid-boss'],
  weeklyRepeatableCap: 300,
  // Blizzard-Wochenreset EU: Mittwoch 04:00 UTC
  weekReset: { weekday: 3, hourUtc: 4 },
  professionMilestones: [75, 150, 225, 300],
}
