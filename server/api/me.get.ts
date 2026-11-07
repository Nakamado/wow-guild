import { demoPersonas } from '../../data/demo/personas'
import { PRIVACY_NOTICE_VERSION } from '#shared/domain/admin'

/** Aktueller Betrachter (Zugriffsstufe, Mitglied), Login-Status und Demo-Steuerung. */
export default defineEventHandler(async (event) => {
  const viewer = await getViewer(event)
  const config = useRuntimeConfig(event)
  const demoMode = Boolean(config.public.demoMode)

  const member = !viewer.user && viewer.memberId ? await useProviders().members.getMember(viewer.memberId) : null
  // Bestehende Mitglieder sehen den Hinweis zur geänderten Datenschutzerklärung einmal
  const account = viewer.user ? await siteAccount(viewer.user.id) : undefined

  return {
    level: viewer.level,
    memberId: viewer.memberId,
    displayName: viewer.user?.displayName ?? member?.displayName ?? null,
    avatarUrl: viewer.user?.avatarUrl ?? member?.avatarUrl ?? null,
    /** Discord-Login ist eingerichtet (nur live) */
    loginAvailable: !demoMode && Boolean(config.discord.clientId && config.discord.clientSecret),
    privacyNoticePending: Boolean(account && account.privacyNoticeVersion < PRIVACY_NOTICE_VERSION),
    demo: demoMode
      ? {
          persona: viewer.persona,
          personas: Object.entries(demoPersonas).map(([id, persona]) => ({ id, label: persona.label })),
          simulateLive: isDemoLiveSimulated(event),
        }
      : null,
  }
})
