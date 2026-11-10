import { z } from 'zod'
import { isUpcoming } from '#shared/domain/runs'

const BodySchema = z.object({ confirm: z.literal(true) })

/**
 * Eigenes Konto löschen: Profil, Charaktere, Anmeldungen, selbst organisierte Gruppen, eigene Aushänge,
 * Ranglisten-Zustimmung und -Freigaben samt Nachweisen. Im Protokoll bleibt nur „Konto gelöscht“
 * (bis zum Ablauf der Frist). Ein erneuter Discord-Login legt ein neues, leeres Konto an.
 */
export default defineEventHandler(async (event) => {
  const { writers, viewer } = await beginWrite(event)
  await readValidatedBody(event, BodySchema.parse)
  if (viewer.level === 'superadmin') {
    rejectWith({ code: 'superadmin-fixed', message: 'Das Konto des Hauptadmins lässt sich hier nicht löschen.' }, 403)
  }
  const accounts = requireStore(useAccountStore())
  const memberId = viewer.memberId

  // Kommende Anmeldungen bei fremden Gruppen sauber abmelden, damit die Warteliste nachrückt
  const now = new Date()
  const runs = await useProviders().groups.list()
  for (const run of runs) {
    if (run.organizerId === memberId || !isUpcoming(run, now)) continue
    if ([...run.participants, ...run.waitlist].some(entry => entry.memberId === memberId)) {
      await persist(() => writers.groups.leave(run.id, memberId))
    }
  }

  await persist(async () => useGrantStore()?.deleteEvidenceForMember(memberId))
  await persist(() => accounts.deleteAccount(memberId))
  // eigene Benachrichtigungen mitlöschen (best effort, die Tabelle hängt nicht am Profil)
  await useNotificationStore()?.deleteForMember(memberId).catch(error => console.warn(`[notifications] Löschen für ${memberId} fehlgeschlagen: ${error instanceof Error ? error.message : 'unbekannt'}`))
  forgetSiteAccount(memberId)
  await logActivity({ action: 'account.deleted', actorId: memberId, subjectType: 'member', subjectId: memberId, summary: 'Konto vom Mitglied selbst gelöscht' })
  await clearUserSession(event)
  setResponseStatus(event, 204)
  return null
})
