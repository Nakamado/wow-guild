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
  return {
    character: withProfessions ?? character,
    media,
    member: { id: member.id, displayName: member.displayName, avatarUrl: member.avatarUrl },
    otherCharacters: siblings,
  }
})
