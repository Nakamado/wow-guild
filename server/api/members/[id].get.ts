import { z } from 'zod'

const ParamsSchema = z.object({ id: z.string().min(1).max(64) })

export default defineEventHandler(async (event) => {
  requirePermission(event, 'members:view')
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)

  const providers = useProviders()
  const member = await providers.members.getMember(id)
  if (!member || !member.isGuildMember) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', message: 'Dieses Mitglied gibt es nicht (mehr).' })
  }
  const characters = sortCharacters(await providers.characters.listByMember(id))
  return { ...member, characters }
})
