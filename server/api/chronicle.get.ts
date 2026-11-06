import { manualMilestones, showExampleMilestones } from '../../content/chronicle'
import { exampleMilestones } from '../../data/demo/chronicle'
import { mergeMilestones } from '#shared/domain/chronicle'

/**
 * Gilden-Chronik: manuelle Einträge (content/chronicle.ts) + optional Beispieldaten.
 * Automatisch erkannte Meilensteine (Blizzard-API, Addon) kommen später aus Supabase hinzu
 * und laufen durch dieselbe Zusammenführung (keine Duplikate, manuell hat Vorrang).
 */
export default defineEventHandler(() => {
  const automatic: typeof manualMilestones = []
  const examples = showExampleMilestones ? exampleMilestones : []
  return mergeMilestones(manualMilestones, automatic, examples)
})
