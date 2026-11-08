import { characterSlug } from '../../providers/blizzard/progress'
import { z } from 'zod'

const ParamsSchema = z.object({ id: z.string().min(1).max(64) })

export default defineEventHandler(async (event) => {
  await requirePermission(event, 'members:view')
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)

  const providers = useProviders()
  const character = await providers.characters.get(id)
  const member = character ? await providers.members.getMember(character.memberId) : null
  if (!character || !member?.isGuildMember) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Diesen Charakter gibt es nicht (mehr).' })
  }
  const siblings = sortCharacters(await providers.characters.listByMember(member.id)).filter(entry => entry.id !== id)
  const [[withProfessions], media] = await Promise.all([withGameData([character]), characterMedia(character.name)])
  const resolved = withProfessions ?? character
  // Dungeon-Fortschritt aus den abgeschlossenen Quests (nur Live-Betrieb mit Blizzard-Daten)
  const quests = resolved.source === 'blizzard'
    ? await questProgressFor([{ name: resolved.name, faction: resolved.faction ?? null }]).catch(() => null)
    : null
  const progress = quests?.results.get(characterSlug(resolved.name))?.progress ?? null
  return {
    character: resolved,
    media,
    dungeonProgress: progress
      ? {
          dungeons: progress.dungeons.filter(entry => entry.done > 0).sort((a, b) => Number(b.complete) - Number(a.complete) || b.done / b.total - a.done / a.total),
          dungeonQuests: progress.dungeonQuests.length,
          groupQuests: progress.groupQuests.length,
        }
      : null,
    member: { id: member.id, displayName: member.displayName, avatarUrl: member.avatarUrl },
    otherCharacters: siblings,
  }
})
