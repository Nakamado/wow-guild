import { can } from '#shared/domain/permissions'

/** Adminbereich – registrierte Mitglieder mit Webseitenrolle (Admins und Hauptadmin) */
export default defineEventHandler(async (event) => {
  const viewer = await requirePermission(event, 'admin:area')
  const members = await persist(() => requireStore(useAccountStore()).listForAdmin())
  const superadmin = superadminId(event)
  return {
    canManageRoles: can(viewer, 'roles:manage'),
    members: members.map(member => ({
      ...member,
      role: member.id === superadmin ? 'superadmin' as const : member.isAdmin ? 'admin' as const : 'member' as const,
    })),
  }
})
