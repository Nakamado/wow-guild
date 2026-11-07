import { PRIVACY_NOTICE_VERSION } from '#shared/domain/admin'

/** Einmaligen Hinweis zur geänderten Datenschutzerklärung als gelesen markieren */
export default defineEventHandler(async (event) => {
  assertSameOrigin(event)
  const viewer = await getViewer(event)
  if (!viewer.user) throw createError({ statusCode: 401, statusMessage: 'Unauthorized', message: 'Bitte melde dich an.' })
  await persist(() => requireStore(useAccountStore()).confirmPrivacyNotice(viewer.user!.id, PRIVACY_NOTICE_VERSION))
  forgetSiteAccount(viewer.user.id)
  setResponseStatus(event, 204)
  return null
})
