import type { H3Event } from 'h3'
import { retainUntil } from '#shared/domain/admin'
import { parseIdList } from '#shared/domain/permissions'
import type { ActivityInput } from '../repositories/supabase/activity'
import type { SiteAccount } from '../repositories/supabase/accounts'

let warnedSuperadmin = false

/**
 * Discord-ID des Hauptadmins: NUXT_SUPERADMIN_USER_ID. Übergangsweise auch NUXT_ADMIN_USER_IDS,
 * wenn dort genau eine ID steht (bisherige Betreiber-Konfiguration).
 */
export function superadminId(event?: H3Event): string | null {
  const config = useRuntimeConfig(event)
  const explicit = String(config.superadminUserId ?? '').trim()
  if (/^\d{5,25}$/.test(explicit)) return explicit
  const legacy = parseIdList(config.adminUserIds)
  if (legacy.length === 1 && /^\d{5,25}$/.test(legacy[0]!)) {
    if (!warnedSuperadmin) console.info('[admin] Hauptadmin aus NUXT_ADMIN_USER_IDS übernommen – besser NUXT_SUPERADMIN_USER_ID setzen.')
    warnedSuperadmin = true
    return legacy[0]!
  }
  return null
}

const ACCOUNT_TTL = 30_000
const accountCache = new Map<string, { at: number, account: SiteAccount | null }>()

/**
 * Konto aus der Datenbank (Webseitenrolle) – 30 Sekunden zwischengespeichert, damit nicht jede
 * Anfrage die Datenbank fragt. `undefined` = keine Datenbank bzw. nicht abrufbar.
 */
export async function siteAccount(memberId: string): Promise<SiteAccount | null | undefined> {
  const store = useAccountStore()
  if (!store) return undefined
  const cached = accountCache.get(memberId)
  if (cached && Date.now() - cached.at < ACCOUNT_TTL) return cached.account
  try {
    const account = await store.get(memberId)
    accountCache.set(memberId, { at: Date.now(), account })
    return account
  }
  catch (error) {
    console.warn(`[admin] Konto nicht lesbar: ${error instanceof Error ? error.message : 'unbekannt'}`)
    return cached?.account ?? undefined
  }
}

export function forgetSiteAccount(memberId: string) {
  accountCache.delete(memberId)
}

/**
 * Wesentliche Änderung protokollieren (nur Aktion, Zeitpunkt, ausführende ID, betroffene ID, kurze Beschreibung).
 * Fehler werden nur geloggt – die eigentliche Aktion soll daran nicht scheitern.
 */
export async function logActivity(entry: ActivityInput) {
  const store = useActivityStore()
  if (!store) return
  try {
    const days = Number(useRuntimeConfig().retention.activityDays) || 90
    await store.record(entry, retainUntil(new Date(), days))
  }
  catch (error) {
    console.warn(`[activity] Eintrag nicht gespeichert (${entry.action}): ${error instanceof Error ? error.message : 'unbekannt'}`)
  }
}

/** Abgelaufene Protokolleinträge und alte zurückgezogene Freigaben löschen */
export async function purgeExpiredRecords(now = new Date()) {
  const retention = useRuntimeConfig().retention
  const activity = useActivityStore()
  const grants = useGrantStore()
  const revokedDays = Number(retention.revokedGrantDays) || 365
  const notifications = useNotificationStore()
  const [activityDeleted, grantsDeleted, notificationsDeleted] = await Promise.all([
    activity ? activity.purgeExpired(now) : 0,
    grants ? grants.purgeRevoked(new Date(now.getTime() - revokedDays * 86_400_000)) : 0,
    notifications
      ? notifications.purgeOlderThan(new Date(now.getTime() - NOTIFICATION_RETENTION_DAYS * 86_400_000)).catch(() => 0)
      : 0,
  ])
  return { activityDeleted, grantsDeleted, notificationsDeleted }
}

/** Der Adminbereich braucht die Datenbank – im Demo-Modus oder ohne Supabase verständlich ablehnen */
export function requireStore<T>(store: T | null): T {
  if (store) return store
  throw createError({
    statusCode: 409,
    statusMessage: 'Conflict',
    message: useRuntimeConfig().public.demoMode
      ? 'Der Adminbereich funktioniert nur auf der echten Seite, nicht im Demo-Modus.'
      : 'Der Adminbereich braucht die Datenbank – sie ist gerade nicht eingerichtet.',
  })
}
