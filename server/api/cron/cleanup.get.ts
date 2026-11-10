import { timingSafeEqual } from 'node:crypto'

/**
 * Tägliche Bereinigung (Vercel Cron, siehe vercel.json): abgelaufene Protokolleinträge und
 * alte zurückgezogene Ranglistenfreigaben löschen. Nur mit „Authorization: Bearer <CRON_SECRET>“.
 */
export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig(event).cronSecret || process.env.CRON_SECRET || '')
  const header = getRequestHeader(event, 'authorization') ?? ''
  const expected = Buffer.from(`Bearer ${secret}`)
  const given = Buffer.from(header)
  if (!secret || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }
  const result = await purgeExpiredRecords()
  console.info(`[cleanup] Protokoll: ${result.activityDeleted} gelöscht, zurückgezogene Freigaben: ${result.grantsDeleted} gelöscht, Benachrichtigungen: ${result.notificationsDeleted} gelöscht`)
  return result
})
