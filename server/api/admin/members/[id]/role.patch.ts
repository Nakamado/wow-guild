import { z } from 'zod'
import { checkRoleChange } from '#shared/domain/admin'
import { RoleChangeSchema } from '#shared/schemas/admin'

const ParamsSchema = z.object({ id: z.string().regex(/^\d{5,25}$/) })

/**
 * Admin ernennen bzw. zurückstufen – ausschließlich der Hauptadmin. Der Hauptadmin selbst
 * steht in der Konfiguration und lässt sich hier weder vergeben noch entfernen.
 */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await requirePermission(event, 'roles:manage')
  const { id } = await getValidatedRouterParams(event, ParamsSchema.parse)
  const { role } = await readValidatedBody(event, RoleChangeSchema.parse)
  const accounts = requireStore(useAccountStore())

  const target = await persist(() => accounts.get(id))
  const check = checkRoleChange({ actorLevel: viewer.level, actorId: viewer.memberId, targetId: id, superadminId: superadminId(event), targetExists: target !== null })
  if (!check.ok) rejectWith(check.error, check.error.code === 'not-found' ? 404 : 403)

  const makeAdmin = role === 'admin'
  if (target!.isAdmin === makeAdmin) return { id, role }
  await persist(() => accounts.setAdmin(id, makeAdmin))
  forgetSiteAccount(id)
  await logActivity(makeAdmin
    ? { action: 'role.promoted', actorId: viewer.memberId, subjectType: 'member', subjectId: id, summary: 'Zum Admin ernannt' }
    : { action: 'role.demoted', actorId: viewer.memberId, subjectType: 'member', subjectId: id, summary: 'Zum Mitglied zurückgestuft' })
  return { id, role }
})
