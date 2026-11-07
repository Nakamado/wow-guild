import { guildFoundedOn, manualMilestones } from '../../content/chronicle'
import { exampleMilestones } from '../../data/demo/chronicle'
import { detectMilestones, mergeMilestones } from '#shared/domain/chronicle'
import type { GuildMilestone } from '#shared/schemas/chronicle'

/**
 * Gilden-Chronik:
 * - manuelle Einträge (content/chronicle.ts)
 * - Gründung (Datum aus der Blizzard-API, sonst `guildFoundedOn`)
 * - automatisch erkannte Meilensteine aus der Gildenliste (Mitgliederzahl, erste Stufe 40/50/60);
 *   einmal erkannt, werden sie in Supabase festgehalten und bleiben mit ihrem Erkennungsdatum stehen
 * - Demo-Modus: zusätzlich fiktive Beispiele
 */
export default defineEventHandler(async (event) => {
  const { guild, demoMode } = useRuntimeConfig(event).public
  if (demoMode) return mergeMilestones(manualMilestones, exampleMilestones)

  const { roster, createdAt } = await guildOverview()
  const detected = await detectedMilestones(roster)
  return mergeMilestones(manualMilestones, [founding(guild.name, createdAt), ...detected])
})

function founding(guildName: string, createdAt: string | null): GuildMilestone {
  return {
    id: 'gildengruendung',
    type: 'guild.founded',
    dedupeKey: 'guild.founded',
    title: `Gründung der Gilde ${guildName}`,
    description: 'Der Startschuss: Unsere Gilde in WoW: Forever ist gegründet.',
    category: 'community',
    icon: 'sparkle',
    highlight: true,
    source: createdAt ? 'blizzard-api' : 'manual',
    occurredAt: createdAt ?? guildFoundedOn,
  }
}

async function detectedMilestones(roster: Awaited<ReturnType<typeof guildOverview>>['roster']): Promise<GuildMilestone[]> {
  const store = useMilestoneStore()
  if (!store) return []
  try {
    const existing = await store.list()
    if (!roster?.length) return existing
    const found = detectMilestones({
      memberCount: roster.length,
      characters: roster.map(entry => ({ id: entry.slug, name: entry.name, level: entry.level ?? 0, professionSkills: [] })),
    }, existing, { now: new Date() })
    if (found.length) await store.add(found)
    return [...existing, ...found]
  }
  catch (error) {
    console.warn('[chronicle] Meilensteine nicht verfügbar:', error instanceof Error ? error.message : 'unbekannt')
    return []
  }
}
